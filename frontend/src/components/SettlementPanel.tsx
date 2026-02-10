import React, { useState } from 'react';
import { Room } from '../types';

interface Props {
  room: Room;
  playerId: string;
  onSettle: (potWinners: Record<string, string[]>) => void;
}

export default function SettlementPanel({ room, playerId, onSettle }: Props) {
  const hand = room.hand;
  const [potWinners, setPotWinners] = useState<Record<string, string[]>>({});

  if (!hand || hand.phase !== 'showdown') return null;

  const pots = hand.pots || [];
  const toggleWinner = (potId: string, pid: string) => {
    setPotWinners(prev => {
      const current = prev[potId] || [];
      if (current.includes(pid)) {
        return { ...prev, [potId]: current.filter(id => id !== pid) };
      } else {
        return { ...prev, [potId]: [...current, pid] };
      }
    });
  };

  const allPotsHaveWinners = pots.every(pot => (potWinners[pot.id] || []).length > 0);

  const handleSubmit = () => {
    if (!allPotsHaveWinners) return;
    onSettle(potWinners);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-yellow-400">🏆 摊牌结算</h3>
        <p className="text-xs text-slate-400 mt-1">为每个池选择赢家（可多选表示平分）</p>
      </div>

      {pots.map((pot, idx) => (
        <div key={pot.id} className="bg-slate-700/50 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              {idx === 0 ? '主池 (Main Pot)' : `边池 ${idx} (Side Pot)`}
            </span>
            <span className="text-lg font-bold text-yellow-400">{pot.amount}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {pot.eligible_players.map(pid => {
              const p = room.players[pid];
              if (!p) return null;
              const isSelected = (potWinners[pot.id] || []).includes(pid);
              return (
                <button
                  key={pid}
                  onClick={() => toggleWinner(pot.id, pid)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition text-left ${
                    isSelected
                      ? 'border-yellow-500 bg-yellow-900/30 text-yellow-300'
                      : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span>{p.emoji}</span>
                  <span className="text-xs truncate">{p.name}</span>
                  {isSelected && <span className="ml-auto text-yellow-400">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={!allPotsHaveWinners}
        className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:text-slate-400 rounded-xl text-white font-bold text-lg transition"
      >
        {allPotsHaveWinners ? '确认结算' : '请为每个池选择赢家'}
      </button>
    </div>
  );
}
