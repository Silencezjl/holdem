from __future__ import annotations
import uuid
from typing import Optional
from .models import (
    Room, HandState, HandPhase, Player, PlayerAction,
    PlayerStatus, PotInfo, RoomStatus,
)


def get_seated_players(room: Room) -> list[Player]:
    """Return players sorted by seat index who are seated."""
    seated = []
    for seat_idx in sorted(room.seats.keys()):
        pid = room.seats[seat_idx]
        if pid and pid in room.players:
            p = room.players[pid]
            if p.seat >= 0 and p.is_connected:
                seated.append(p)
    return seated


def get_active_players(room: Room) -> list[Player]:
    """Players who haven't folded and are seated."""
    return [p for p in get_seated_players(room) if p.status != PlayerStatus.FOLDED and p.status != PlayerStatus.SITTING_OUT]


def get_actionable_players(room: Room) -> list[Player]:
    """Players who can still act (not folded, not all-in)."""
    return [p for p in get_active_players(room) if p.status != PlayerStatus.ALL_IN]


def find_next_dealer(room: Room) -> int:
    """Find next dealer seat, moving clockwise from current dealer."""
    seated = get_seated_players(room)
    if not seated:
        return -1
    
    current_dealer = room.hand.dealer_seat if room.hand else -1
    seat_indices = [p.seat for p in seated]
    
    if current_dealer == -1:
        return seat_indices[0]
    
    # Find next occupied seat after current dealer
    for s in seat_indices:
        if s > current_dealer:
            return s
    return seat_indices[0]


def find_next_seat(seat_indices: list[int], after_seat: int) -> int:
    """Find next seat in clockwise order after given seat."""
    for s in seat_indices:
        if s > after_seat:
            return s
    return seat_indices[0]


def start_hand(room: Room) -> Room:
    """Initialize a new hand."""
    seated = get_seated_players(room)
    if len(seated) < 2:
        return room
    
    room.status = RoomStatus.PLAYING
    room.hand_number += 1
    
    seat_indices = [p.seat for p in seated]
    
    # Reset all seated players
    for p in seated:
        p.status = PlayerStatus.ACTIVE
        p.current_bet = 0
        p.total_bet_this_hand = 0
        p.has_acted = False
    
    # Determine dealer position
    dealer_seat = find_next_dealer(room)
    
    if len(seated) == 2:
        # Heads-up: dealer is SB
        sb_seat = dealer_seat
        bb_seat = find_next_seat(seat_indices, sb_seat)
    else:
        sb_seat = find_next_seat(seat_indices, dealer_seat)
        bb_seat = find_next_seat(seat_indices, sb_seat)
    
    hand = HandState(
        phase=HandPhase.PREFLOP,
        dealer_seat=dealer_seat,
        sb_seat=sb_seat,
        bb_seat=bb_seat,
        current_bet=room.bb_amount,
        pot=0,
    )
    room.hand = hand
    
    # Post blinds
    sb_player = room.players[room.seats[sb_seat]]
    bb_player = room.players[room.seats[bb_seat]]
    
    sb_actual = min(sb_player.chips, room.sb_amount)
    bb_actual = min(bb_player.chips, room.bb_amount)
    
    sb_player.chips -= sb_actual
    sb_player.current_bet = sb_actual
    sb_player.total_bet_this_hand = sb_actual
    if sb_player.chips == 0:
        sb_player.status = PlayerStatus.ALL_IN
    
    bb_player.chips -= bb_actual
    bb_player.current_bet = bb_actual
    bb_player.total_bet_this_hand = bb_actual
    if bb_player.chips == 0:
        bb_player.status = PlayerStatus.ALL_IN
    
    hand.pot = sb_actual + bb_actual
    
    # Build preflop action order: start from UTG (after BB)
    action_order = build_action_order(room, after_seat=bb_seat)
    hand.action_order = action_order
    hand.action_index = 0
    
    if action_order:
        hand.current_player_id = action_order[0]
    
    return room


def build_action_order(room: Room, after_seat: int) -> list[str]:
    """Build action order starting from player after given seat."""
    seated = get_seated_players(room)
    seat_indices = [p.seat for p in seated]
    
    # Reorder starting from after_seat
    start_idx = 0
    for i, s in enumerate(seat_indices):
        if s > after_seat:
            start_idx = i
            break
    else:
        start_idx = 0
    
    ordered = seat_indices[start_idx:] + seat_indices[:start_idx]
    
    result = []
    for s in ordered:
        pid = room.seats[s]
        if pid and pid in room.players:
            p = room.players[pid]
            if p.status == PlayerStatus.ACTIVE:
                result.append(pid)
    
    return result


def process_action(room: Room, player_id: str, action: PlayerAction, amount: int = 0) -> tuple[Room, dict]:
    """Process a player action. Returns updated room and event dict."""
    hand = room.hand
    if not hand or hand.current_player_id != player_id:
        return room, {"error": "Not your turn"}
    
    player = room.players[player_id]
    event = {"action": action.value, "player_id": player_id, "player_name": player.name}
    
    if action == PlayerAction.FOLD:
        player.status = PlayerStatus.FOLDED
        player.has_acted = True
        event["detail"] = "folded"
        
    elif action == PlayerAction.CHECK:
        if hand.current_bet > player.current_bet:
            return room, {"error": "Cannot check, must call or raise"}
        player.has_acted = True
        event["detail"] = "checked"
        
    elif action == PlayerAction.CALL:
        call_amount = hand.current_bet - player.current_bet
        actual_call = min(call_amount, player.chips)
        player.chips -= actual_call
        player.current_bet += actual_call
        player.total_bet_this_hand += actual_call
        hand.pot += actual_call
        if player.chips == 0:
            player.status = PlayerStatus.ALL_IN
        player.has_acted = True
        event["detail"] = f"called {actual_call}"
        event["amount"] = actual_call
        
    elif action == PlayerAction.RAISE:
        if amount <= hand.current_bet:
            return room, {"error": f"Raise must be more than current bet {hand.current_bet}"}
        raise_to = amount
        cost = raise_to - player.current_bet
        actual_cost = min(cost, player.chips)
        player.chips -= actual_cost
        actual_raise_to = player.current_bet + actual_cost
        player.current_bet = actual_raise_to
        player.total_bet_this_hand += actual_cost
        hand.pot += actual_cost
        hand.current_bet = actual_raise_to
        hand.last_raiser_id = player_id
        if player.chips == 0:
            player.status = PlayerStatus.ALL_IN
        player.has_acted = True
        # Reset has_acted for others who need to respond to raise
        for pid in hand.action_order:
            if pid != player_id:
                p = room.players[pid]
                if p.status == PlayerStatus.ACTIVE:
                    p.has_acted = False
        player.has_acted = True
        event["detail"] = f"raised to {actual_raise_to}"
        event["amount"] = actual_raise_to
        
    elif action == PlayerAction.ALL_IN:
        all_in_amount = player.chips
        player.current_bet += all_in_amount
        player.total_bet_this_hand += all_in_amount
        hand.pot += all_in_amount
        player.chips = 0
        player.status = PlayerStatus.ALL_IN
        if player.current_bet > hand.current_bet:
            hand.current_bet = player.current_bet
            hand.last_raiser_id = player_id
            for pid in hand.action_order:
                if pid != player_id:
                    p = room.players[pid]
                    if p.status == PlayerStatus.ACTIVE:
                        p.has_acted = False
        player.has_acted = True
        event["detail"] = f"all-in {player.current_bet}"
        event["amount"] = player.current_bet
    
    # Check if hand should end or street should advance
    room, phase_event = check_street_end(room)
    if phase_event:
        event["phase_change"] = phase_event
    
    return room, event


def check_street_end(room: Room) -> tuple[Room, Optional[dict]]:
    """Check if current street is over and advance accordingly."""
    hand = room.hand
    if not hand:
        return room, None
    
    active = get_active_players(room)
    
    # Only 1 player remaining -> hand ends
    if len(active) <= 1:
        return end_hand_single_winner(room)
    
    actionable = get_actionable_players(room)
    
    # Check if all actionable players have acted and matched the bet
    all_acted = True
    for p in actionable:
        if not p.has_acted:
            all_acted = False
            break
        if p.current_bet < hand.current_bet and p.status == PlayerStatus.ACTIVE:
            all_acted = False
            break
    
    if not all_acted:
        # Move to next player
        advance_to_next_player(room)
        return room, None
    
    # If no actionable players left (all are all-in or folded), go to showdown
    if len(actionable) == 0:
        return advance_to_showdown(room)
    
    # Street is complete, advance
    return advance_street(room)


def advance_to_next_player(room: Room):
    """Move current_player_id to next actionable player."""
    hand = room.hand
    if not hand:
        return
    
    actionable = get_actionable_players(room)
    if not actionable:
        return
    
    seated = get_seated_players(room)
    seat_to_pid = {p.seat: p.id for p in seated}
    seat_indices = sorted(seat_to_pid.keys())
    actionable_ids = {p.id for p in actionable}
    
    # Find current player's seat
    current_pid = hand.current_player_id
    if current_pid not in room.players:
        hand.current_player_id = actionable[0].id
        return
    
    current_seat = room.players[current_pid].seat
    
    # Find next actionable player by seat order
    ordered_seats = []
    found = False
    for s in seat_indices:
        if s > current_seat:
            found = True
        if found:
            ordered_seats.append(s)
    for s in seat_indices:
        if s <= current_seat:
            ordered_seats.append(s)
    
    for s in ordered_seats:
        pid = seat_to_pid.get(s)
        if pid and pid in actionable_ids and pid != current_pid:
            p = room.players[pid]
            if not p.has_acted or p.current_bet < hand.current_bet:
                hand.current_player_id = pid
                return
    
    # Fallback
    hand.current_player_id = actionable[0].id


def advance_street(room: Room) -> tuple[Room, Optional[dict]]:
    """Mark current street as complete, pause for physical card dealing."""
    hand = room.hand
    hand.street_complete = True
    hand.current_player_id = None
    return room, {"phase": hand.phase.value, "street_complete": True}


def do_advance_street(room: Room) -> tuple[Room, Optional[dict]]:
    """Actually advance to the next street (called when player clicks next)."""
    hand = room.hand
    if not hand or not hand.street_complete:
        return room, {"error": "Street not complete"}

    phase_order = [HandPhase.PREFLOP, HandPhase.FLOP, HandPhase.TURN, HandPhase.RIVER, HandPhase.SHOWDOWN]
    current_idx = phase_order.index(hand.phase)
    
    if current_idx >= len(phase_order) - 1:
        return advance_to_showdown(room)
    
    next_phase = phase_order[current_idx + 1]
    
    if next_phase == HandPhase.SHOWDOWN:
        return advance_to_showdown(room)
    
    hand.phase = next_phase
    hand.current_bet = 0
    hand.last_raiser_id = None
    hand.street_complete = False
    
    # Reset player bets for new street
    for p in room.players.values():
        p.current_bet = 0
        if p.status == PlayerStatus.ACTIVE:
            p.has_acted = False
    
    # Build action order from SB (or first active after dealer)
    action_order = build_action_order(room, after_seat=hand.dealer_seat)
    hand.action_order = action_order
    hand.action_index = 0
    
    if action_order:
        hand.current_player_id = action_order[0]
    else:
        return advance_to_showdown(room)
    
    return room, {"phase": next_phase.value}


def advance_to_showdown(room: Room) -> tuple[Room, Optional[dict]]:
    """Move to showdown phase."""
    hand = room.hand
    hand.phase = HandPhase.SHOWDOWN
    hand.current_player_id = None
    
    # Calculate pots
    hand.pots = calculate_pots(room)
    
    return room, {"phase": "showdown", "pots": [p.model_dump() for p in hand.pots]}


def end_hand_single_winner(room: Room) -> tuple[Room, Optional[dict]]:
    """End hand when only one player remains."""
    hand = room.hand
    active = get_active_players(room)
    
    if len(active) == 1:
        winner = active[0]
        winner.chips += hand.pot
        event = {
            "phase": "hand_end",
            "winner": winner.id,
            "winner_name": winner.name,
            "pot": hand.pot,
            "single_winner": True,
        }
        reset_hand(room)
        return room, event
    
    # Fallback
    hand.pots = calculate_pots(room)
    return room, {"phase": "showdown"}


def calculate_pots(room: Room) -> list[PotInfo]:
    """Calculate main pot and side pots based on all-in amounts."""
    active = get_active_players(room)
    if not active:
        return []
    
    # Gather all bet amounts from active players
    bets = []
    for p in get_seated_players(room):
        if p.total_bet_this_hand > 0:
            bets.append((p.id, p.total_bet_this_hand, p.status != PlayerStatus.FOLDED))
    
    if not bets:
        return [PotInfo(id=str(uuid.uuid4())[:8], amount=room.hand.pot, eligible_players=[p.id for p in active])]
    
    # Sort by bet amount
    bets.sort(key=lambda x: x[1])
    
    pots = []
    prev_level = 0
    remaining_players = [(pid, amt, eligible) for pid, amt, eligible in bets]
    
    levels = sorted(set(amt for _, amt, _ in bets))
    
    for level in levels:
        pot_amount = 0
        eligible = []
        for pid, amt, is_active in remaining_players:
            contribution = min(amt, level) - prev_level
            if contribution > 0:
                pot_amount += contribution
            if is_active and amt >= level:
                eligible.append(pid)
        
        if pot_amount > 0 and eligible:
            pots.append(PotInfo(
                id=str(uuid.uuid4())[:8],
                amount=pot_amount,
                eligible_players=eligible,
            ))
        prev_level = level
    
    # If no pots created, create one main pot
    if not pots:
        pots.append(PotInfo(
            id=str(uuid.uuid4())[:8],
            amount=room.hand.pot,
            eligible_players=[p.id for p in active],
        ))
    
    return pots


def settle_pots(room: Room, pot_winners: dict[str, list[str]]) -> tuple[Room, dict]:
    """Settle pots by distributing to winners. pot_winners: pot_id -> [winner_ids]"""
    hand = room.hand
    if not hand or hand.phase != HandPhase.SHOWDOWN:
        return room, {"error": "Not in showdown phase"}
    
    settlements = []
    
    for pot in hand.pots:
        winners = pot_winners.get(pot.id, [])
        if not winners:
            continue
        
        # Filter winners to only eligible players
        valid_winners = [w for w in winners if w in pot.eligible_players]
        if not valid_winners:
            continue
        
        share = pot.amount // len(valid_winners)
        remainder = pot.amount % len(valid_winners)
        
        for i, wid in enumerate(valid_winners):
            award = share + (1 if i < remainder else 0)
            room.players[wid].chips += award
            settlements.append({
                "pot_id": pot.id,
                "player_id": wid,
                "player_name": room.players[wid].name,
                "amount": award,
            })
    
    event = {"phase": "hand_end", "settlements": settlements, "single_winner": False}
    reset_hand(room)
    
    return room, event


def reset_hand(room: Room):
    """Reset hand state, prepare for next hand."""
    # Keep the dealer seat info for next hand
    old_dealer = room.hand.dealer_seat if room.hand else -1
    
    room.hand = HandState(dealer_seat=old_dealer)
    room.status = RoomStatus.WAITING
    
    # Reset player statuses
    for p in room.players.values():
        if p.seat >= 0:
            p.status = PlayerStatus.ACTIVE
            p.current_bet = 0
            p.total_bet_this_hand = 0
            p.has_acted = False
            p.ready = False


def can_rebuy(room: Room, player_id: str) -> bool:
    """Check if player is eligible to rebuy."""
    player = room.players.get(player_id)
    if not player:
        return False
    if room.status == RoomStatus.PLAYING:
        return False
    return player.chips <= room.rebuy_minimum


def do_rebuy(room: Room, player_id: str) -> tuple[Room, dict]:
    """Process a rebuy for a player."""
    if not can_rebuy(room, player_id):
        return room, {"error": "Cannot rebuy"}
    player = room.players[player_id]
    player.chips = room.initial_chips
    return room, {"rebuy": True, "player_id": player_id, "chips": player.chips}
