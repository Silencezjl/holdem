const API_BASE = process.env.REACT_APP_API_URL || '';
const WS_BASE = process.env.REACT_APP_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

export async function fetchRooms() {
  const res = await fetch(`${API_BASE}/api/rooms`);
  return res.json();
}

export async function createRoom(data: {
  player_name: string;
  player_emoji: string;
  sb_amount: number;
  initial_chips: number;
  rebuy_minimum: number;
  hand_interval?: number;
}) {
  const res = await fetch(`${API_BASE}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function joinRoom(data: {
  room_id: string;
  player_name: string;
  player_emoji: string;
}) {
  const res = await fetch(`${API_BASE}/api/rooms/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getRandomProfile() {
  const res = await fetch(`${API_BASE}/api/random-profile`);
  return res.json();
}

export function connectWs(roomId: string, playerId: string): WebSocket {
  return new WebSocket(`${WS_BASE}/ws/${roomId}/${playerId}`);
}
