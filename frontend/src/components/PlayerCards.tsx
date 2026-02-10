import React from 'react';
import { Room } from '../types';

interface Props {
  room: Room;
  playerId: string;
}

function getRoleLabel(room: Room, seatIdx: number): string | null {
  const hand = room.hand;
  if (!hand) return null;
  if (hand.dealer_seat === seatIdx) return 'D';
  if (hand.sb_seat === seatIdx) return 'SB';
  if (hand.bb_seat === seatIdx) return 'BB';
  return null;
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'D': return 'bg-yellow-500 text-black';
    case 'SB': return 'bg-cyan-600 text-white';
    case 'BB': return 'bg-orange-600 text-white';
    default: return 'bg-slate-600';
  }
}

export default function PlayerCards({ room, playerId }: Props) {
  const hand = room.hand;
  // Sort by seat index
  const seatedPlayers = Object.values(room.players)
    .filter(p => p.seat >= 0)
    .sort((a, b) => a.seat - b.seat);

  if (seatedPlayers.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {/* Pot info */}
      {hand && (
        <div className="flex items-center justify-center gap-4 py-2 px-3 bg-slate-800/80 rounded-xl mb-2">
          <div className="text-center">
            <span className="text-xs text-slate-400">底池</span>
            <p className="text-lg font-bold text-yellow-400">{hand.pot}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-slate-400">阶段</span>
            <p className="text-sm font-semibold text-blue-400 uppercase">{hand.phase}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-slate-400">当前注</span>
            <p className="text-sm font-bold text-white">{hand.current_bet}</p>
          </div>
        </div>
      )}

      {/* Player cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {seatedPlayers.map(p => {
          const isMe = p.id === playerId;
          const isCurrentTurn = hand?.current_player_id === p.id;
          const isFolded = p.status === 'folded';
          const isAllIn = p.status === 'all_in';
          const role = getRoleLabel(room, p.seat);

          return (
            <div
              key={p.id}
              className={`relative px-2.5 py-2 rounded-xl border transition-all ${
                isCurrentTurn
                  ? 'border-yellow-400 bg-yellow-900/20 shadow-lg shadow-yellow-900/30 animate-pulse'
                  : isFolded
                  ? 'border-slate-700 bg-slate-800/40 opacity-50'
                  : isMe
                  ? 'border-blue-500/60 bg-slate-800'
                  : 'border-slate-700 bg-slate-800'
              }`}
            >
              {/* Role badge */}
              {role && (
                <span className={`absolute -top-1.5 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getRoleBadgeColor(role)}`}>
                  {role}
                </span>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xl">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">#{p.seat + 1}</span>
                    <span className="text-xs font-medium truncate">{p.name}</span>
                    {isMe && <span className="text-[10px] text-blue-400">(我)</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-green-400">{p.chips}</span>
                    {hand && p.current_bet > 0 && (
                      <span className="text-[10px] text-orange-400">下注: {p.current_bet}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status indicators */}
              {isFolded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-xl">
                  <span className="text-xs font-bold text-red-400">FOLD</span>
                </div>
              )}
              {isAllIn && (
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-red-500 bg-red-900/40 px-1.5 py-0.5 rounded">ALL-IN</span>
                </div>
              )}
              {isCurrentTurn && !isFolded && (
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-yellow-400">⏳ 行动中</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
