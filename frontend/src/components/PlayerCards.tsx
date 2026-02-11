import React from 'react';
import { Room } from '../types';
import ChipDisplay, { PotChipDisplay } from './ChipDisplay';

interface Props {
  room: Room;
  playerId: string;
  phaseNotice?: string | null;
}

const PHASE_CN: Record<string, string> = {
  hand_start: '开始',
  preflop: '翻牌前',
  flop: '翻牌',
  turn: '转牌',
  river: '河牌',
  showdown: '摊牌',
  hand_end: '结束',
};

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

function formatAction(action: string | null): { text: string; color: string } | null {
  if (!action) return null;
  if (action === 'fold') return { text: 'Fold', color: 'text-red-400' };
  if (action === 'check') return { text: 'Check', color: 'text-cyan-400' };
  if (action.startsWith('call:')) return { text: `Call ${action.split(':')[1]}`, color: 'text-green-400' };
  if (action.startsWith('raise:')) return { text: `Raise ${action.split(':')[1]}`, color: 'text-blue-400' };
  if (action.startsWith('all_in:')) return { text: `All-In ${action.split(':')[1]}`, color: 'text-red-500' };
  if (action.startsWith('sb:')) return { text: `SB ${action.split(':')[1]}`, color: 'text-cyan-500' };
  if (action.startsWith('bb:')) return { text: `BB ${action.split(':')[1]}`, color: 'text-orange-400' };
  return null;
}

export default function PlayerCards({ room, playerId, phaseNotice }: Props) {
  const hand = room.hand;
  const seatedPlayers = Object.values(room.players)
    .filter(p => p.seat >= 0)
    .sort((a, b) => a.seat - b.seat);

  if (seatedPlayers.length === 0) return null;

  return (
    <div>
      {/* Phase display with community cards */}
      {hand && (
        <div className="relative flex items-center gap-3 px-3.5 py-2.5 bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-700/40 rounded-xl mb-3 overflow-hidden">
          <div className="flex items-baseline gap-2 flex-shrink-0">
            <span className="text-xl font-bold text-blue-400">阶段</span>
            <span className="text-lg font-bold text-blue-300">{PHASE_CN[hand.phase] || hand.phase}</span>
          </div>
          <div className="flex-1 flex justify-end gap-1">
            {[1, 2, 3, 4, 5].map(i => {
              const faceUp =
                (hand.phase === 'flop' && i <= 3) ||
                (hand.phase === 'turn' && i <= 4) ||
                ((hand.phase === 'river' || hand.phase === 'showdown') && i <= 5);
              return (
                <img
                  key={i}
                  src={faceUp ? `/card/${i}.svg` : '/card/back.svg'}
                  alt={faceUp ? `card ${i}` : 'back'}
                  className="h-10 w-auto rounded-sm drop-shadow-sm"
                />
              );
            })}
          </div>
          {phaseNotice && (
            <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/95 rounded-xl animate-pulse">
              <span className="text-white font-bold text-lg">🃏 进入 {phaseNotice}</span>
            </div>
          )}
        </div>
      )}

      {/* Pot display with chips */}
      {hand && hand.pot > 0 && (
        <div className="flex items-center gap-3 px-3.5 py-3 bg-gradient-to-r from-yellow-900/30 to-amber-900/20 border border-yellow-700/40 rounded-xl mb-[30px]">
          <div className="flex items-baseline gap-2 flex-shrink-0">
            <span className="text-xl font-bold text-yellow-400">底池</span>
            <span className="text-lg font-bold text-yellow-300">{hand.pot}</span>
          </div>
          <div className="flex-1 flex justify-end overflow-x-auto">
            <PotChipDisplay playerBets={seatedPlayers.map(p => p.total_bet_this_hand)} size={26} />
          </div>
        </div>
      )}

      {/* Player list header */}
      <div className="text-sm font-semibold text-slate-400 mb-2">玩家列表</div>

      {/* Player rows - horizontal bars */}
      <div className="space-y-3">
        {seatedPlayers.map(p => {
          const isMe = p.id === playerId;
          const isCurrentTurn = hand?.current_player_id === p.id;
          const isFolded = p.status === 'folded';
          const isAllIn = p.status === 'all_in';
          const role = getRoleLabel(room, p.seat);
          const actionInfo = formatAction(p.last_action);

          return (
            <div
              key={p.id}
              className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
                isCurrentTurn
                  ? 'border-yellow-400 bg-yellow-900/20 shadow-md shadow-yellow-900/30'
                  : isFolded
                  ? 'border-slate-700/50 bg-slate-800/30 opacity-50'
                  : isMe
                  ? 'border-blue-500/60 bg-slate-800/80'
                  : 'border-slate-700/50 bg-slate-800/60'
              }`}
            >
              {/* Emoji + name + chips (left) */}
              <div className="relative flex-shrink-0">
                <span className="text-2xl">{p.emoji}</span>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-800 ${p.is_connected ? 'bg-green-400' : 'bg-red-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">#{p.seat + 1}</span>
                  {role && (
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${getRoleBadgeColor(role)}`}>
                      {role}
                    </span>
                  )}
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  {isMe && <span className="text-[10px] text-blue-400">(我)</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-green-400 font-semibold">💰 {p.chips}</span>
                  {isCurrentTurn && !isFolded && (
                    <span className="text-[10px] font-bold text-yellow-400 animate-pulse">⏳ 行动中</span>
                  )}
                  {actionInfo && (
                    <span className={`text-[11px] font-bold ${actionInfo.color}`}>{actionInfo.text}</span>
                  )}
                  {!actionInfo && isAllIn && (
                    <span className="text-[11px] font-bold text-red-500">All-In</span>
                  )}
                </div>
              </div>

              {/* Right side: chip SVG display for current bet */}
              <div className="flex-shrink-0">
                {hand && p.current_bet > 0 ? (
                  <div className="flex items-center gap-1">
                    <ChipDisplay amount={p.current_bet} size={22} maxChips={6} />
                    <span className="text-xs font-bold text-orange-400 ml-0.5">{p.current_bet}</span>
                  </div>
                ) : null}
              </div>

              {/* Status overlays */}
              {isFolded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-xl">
                  <span className="text-xs font-bold text-red-400/80">FOLD</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
