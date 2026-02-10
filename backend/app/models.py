from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class RoomStatus(str, Enum):
    WAITING = "waiting"
    PLAYING = "playing"


class HandPhase(str, Enum):
    HAND_START = "hand_start"
    PREFLOP = "preflop"
    FLOP = "flop"
    TURN = "turn"
    RIVER = "river"
    SHOWDOWN = "showdown"
    HAND_END = "hand_end"


class PlayerAction(str, Enum):
    FOLD = "fold"
    CHECK = "check"
    CALL = "call"
    RAISE = "raise"
    ALL_IN = "all_in"


class PlayerStatus(str, Enum):
    ACTIVE = "active"
    FOLDED = "folded"
    ALL_IN = "all_in"
    SITTING_OUT = "sitting_out"


class CreateRoomRequest(BaseModel):
    player_name: str
    player_emoji: str
    sb_amount: int
    initial_chips: int
    rebuy_minimum: int = 0  # 0 means must be zero to rebuy


class JoinRoomRequest(BaseModel):
    room_id: str
    player_name: str
    player_emoji: str


class SeatRequest(BaseModel):
    seat_index: int


class ActionRequest(BaseModel):
    action: PlayerAction
    amount: int = 0


class SettlementVote(BaseModel):
    pot_winners: dict[str, list[str]]  # pot_id -> list of winner player_ids


class Player(BaseModel):
    id: str
    name: str
    emoji: str
    chips: int = 0
    seat: int = -1
    ready: bool = False
    status: PlayerStatus = PlayerStatus.SITTING_OUT
    current_bet: int = 0
    total_bet_this_hand: int = 0
    has_acted: bool = False
    is_connected: bool = True


class PotInfo(BaseModel):
    id: str
    amount: int
    eligible_players: list[str]  # player_ids


class HandState(BaseModel):
    phase: HandPhase = HandPhase.HAND_START
    dealer_seat: int = -1
    sb_seat: int = -1
    bb_seat: int = -1
    current_bet: int = 0
    pot: int = 0
    pots: list[PotInfo] = []
    current_player_id: Optional[str] = None
    action_order: list[str] = []
    action_index: int = 0
    last_raiser_id: Optional[str] = None
    street_complete: bool = False


class Room(BaseModel):
    id: str
    status: RoomStatus = RoomStatus.WAITING
    owner_id: str
    sb_amount: int
    bb_amount: int = 0
    initial_chips: int
    rebuy_minimum: int = 0
    players: dict[str, Player] = {}
    seats: dict[int, Optional[str]] = {}  # seat_index -> player_id
    hand: Optional[HandState] = None
    hand_number: int = 0

    def model_post_init(self, __context) -> None:
        if self.bb_amount == 0:
            self.bb_amount = self.sb_amount * 2
        if not self.seats:
            self.seats = {i: None for i in range(12)}
