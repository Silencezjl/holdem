export interface Player {
  id: string;
  name: string;
  emoji: string;
  chips: number;
  seat: number;
  ready: boolean;
  status: 'active' | 'folded' | 'all_in' | 'sitting_out';
  current_bet: number;
  total_bet_this_hand: number;
  has_acted: boolean;
  is_connected: boolean;
}

export interface PotInfo {
  id: string;
  amount: number;
  eligible_players: string[];
}

export interface HandState {
  phase: 'hand_start' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'hand_end';
  dealer_seat: number;
  sb_seat: number;
  bb_seat: number;
  current_bet: number;
  pot: number;
  pots: PotInfo[];
  current_player_id: string | null;
  action_order: string[];
  action_index: number;
  last_raiser_id: string | null;
  street_complete: boolean;
}

export interface Room {
  id: string;
  status: 'waiting' | 'playing';
  owner_id: string;
  sb_amount: number;
  bb_amount: number;
  initial_chips: number;
  rebuy_minimum: number;
  players: Record<string, Player>;
  seats: Record<number, string | null>;
  hand: HandState | null;
  hand_number: number;
}

export interface RoomListItem {
  id: string;
  owner_name: string;
  owner_emoji: string;
  sb_amount: number;
  bb_amount: number;
  initial_chips: number;
  player_count: number;
  status: string;
}

export interface WsMessage {
  type: string;
  [key: string]: any;
}
