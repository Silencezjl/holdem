import React, { useState, useMemo, useEffect } from 'react';
import { Room } from '../types';
import { snapToChip } from './ChipDisplay';

const CHIP_DENOMS = [500, 100, 50, 25, 10, 5] as const;

interface Props {
  room: Room;
  playerId: string;
  onAction: (action: string, amount?: number) => void;
}

export default function ActionPanel({ room, playerId, onAction }: Props) {
  const [showRaise, setShowRaise] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [confirmAllIn, setConfirmAllIn] = useState(false);

  const hand = room.hand;
  const player = room.players[playerId];

  const bb = room.bb_amount;
  const currentBet = hand?.current_bet ?? 0;
  const myBet = player?.current_bet ?? 0;
  const myChips = player?.chips ?? 0;

  const quickRaises = useMemo(() => {
    if (!hand) return [];
    const pot = hand.pot;
    const items: { label: string; amount: number }[] = [];
    const twoBB = snapToChip(bb * 2 + currentBet);
    if (twoBB > currentBet && twoBB <= myChips + myBet) items.push({ label: '2BB', amount: twoBB });
    const halfPot = snapToChip(Math.floor(pot / 2) + currentBet);
    if (halfPot > currentBet && halfPot <= myChips + myBet) items.push({ label: '½ Pot', amount: halfPot });
    const fullPot = snapToChip(pot + currentBet);
    if (fullPot > currentBet && fullPot <= myChips + myBet) items.push({ label: 'Pot', amount: fullPot });
    return items;
  }, [hand, bb, currentBet, myChips, myBet]);

  // Auto-cancel all-in confirmation after 3 seconds
  useEffect(() => {
    if (!confirmAllIn) return;
    const timer = setTimeout(() => setConfirmAllIn(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmAllIn]);

  // Reset all-in confirmation when turn changes
  useEffect(() => {
    setConfirmAllIn(false);
  }, [hand?.current_player_id]);

  if (!hand || !player) return null;

  const isMyTurn = hand.current_player_id === playerId;
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all_in';
  const callAmount = currentBet - myBet;

  const canCheck = currentBet <= myBet;
  const canCall = callAmount > 0 && callAmount <= myChips;
  const minRaise = snapToChip(currentBet + bb);
  const maxRaise = myChips + myBet;

  if (isFolded || isAllIn) {
    return (
      <div className="text-center py-1">
        <p className="text-slate-400 text-sm">
          {isFolded ? '你已弃牌 (Fold)' : `你已全押 (All-In) - 投入: ${player.current_bet}`}
        </p>
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div className="text-center py-1">
        <span className="text-sm text-slate-400">等待其他玩家行动...</span>
      </div>
    );
  }

  if (showRaise) {
    const effectiveRaise = raiseAmount || minRaise;
    const addChip = (d: number) => {
      const next = effectiveRaise + d;
      if (next <= maxRaise) setRaiseAmount(next);
    };
    const removeChip = (d: number) => {
      const next = effectiveRaise - d;
      if (next >= minRaise) setRaiseAmount(next);
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">加注到</span>
          <button onClick={() => setShowRaise(false)} className="text-slate-400 hover:text-white text-sm">
            ✕ 取消
          </button>
        </div>

        {/* Current amount display */}
        <div className="text-center py-1">
          <span className="text-2xl font-bold text-white">{effectiveRaise}</span>
          <span className="text-xs text-slate-400 ml-2">(加注 {effectiveRaise - currentBet})</span>
        </div>

        {/* Chip buttons to add */}
        <div className="flex justify-center gap-1.5">
          {CHIP_DENOMS.map(d => {
            const canAdd = effectiveRaise + d <= maxRaise;
            return (
              <button
                key={d}
                onClick={() => addChip(d)}
                disabled={!canAdd}
                className="relative flex flex-col items-center disabled:opacity-30 transition active:scale-95"
              >
                <img
                  src={`/poker_chip/chip_${d}.svg`}
                  alt={`+${d}`}
                  className="w-11 h-11 drop-shadow-md"
                />
                <span className="text-[9px] text-green-400 font-bold mt-0.5">+{d}</span>
              </button>
            );
          })}
        </div>

        {/* Chip buttons to remove */}
        <div className="flex justify-center gap-1.5">
          {CHIP_DENOMS.map(d => {
            const canRemove = effectiveRaise - d >= minRaise;
            return (
              <button
                key={d}
                onClick={() => removeChip(d)}
                disabled={!canRemove}
                className="relative flex flex-col items-center disabled:opacity-30 transition active:scale-95"
              >
                <img
                  src={`/poker_chip/chip_${d}.svg`}
                  alt={`-${d}`}
                  className="w-8 h-8 drop-shadow-md opacity-60"
                />
                <span className="text-[9px] text-red-400 font-bold mt-0.5">-{d}</span>
              </button>
            );
          })}
        </div>

        {/* Quick raise presets */}
        {quickRaises.length > 0 && (
          <div className="flex gap-1.5 justify-center">
            {quickRaises.map(q => (
              <button
                key={q.label}
                onClick={() => setRaiseAmount(q.amount)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  effectiveRaise === q.amount
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {q.label} {q.amount}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            onAction('raise', effectiveRaise);
            setShowRaise(false);
            setRaiseAmount(0);
          }}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold transition"
        >
          确认加注 → {effectiveRaise}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Action buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          onClick={() => onAction('fold')}
          className="py-2.5 bg-red-900/60 hover:bg-red-800 border border-red-700 rounded-xl text-red-300 font-bold text-sm transition"
        >
          Fold
        </button>

        {canCheck ? (
          <button
            onClick={() => onAction('check')}
            className="py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-white font-bold text-sm transition"
          >
            Check
          </button>
        ) : canCall ? (
          <button
            onClick={() => onAction('call', callAmount)}
            className="py-2.5 bg-green-900/60 hover:bg-green-800 border border-green-700 rounded-xl text-green-300 font-bold text-sm transition"
          >
            Call {callAmount}
          </button>
        ) : <div />}

        <button
          onClick={() => {
            setRaiseAmount(minRaise);
            setShowRaise(true);
          }}
          disabled={myChips <= callAmount}
          className="py-2.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 rounded-xl text-blue-300 font-bold text-sm transition disabled:opacity-40"
        >
          Raise
        </button>

        {confirmAllIn ? (
          <button
            onClick={() => {
              onAction('all_in', myChips + myBet);
              setConfirmAllIn(false);
            }}
            className="py-2.5 bg-red-700 hover:bg-red-600 border border-red-500 rounded-xl text-white font-bold text-sm transition animate-pulse"
          >
            确认All-In?
          </button>
        ) : (
          <button
            onClick={() => setConfirmAllIn(true)}
            className="py-2.5 bg-purple-900/60 hover:bg-purple-800 border border-purple-700 rounded-xl text-purple-300 font-bold text-sm transition"
          >
            All-In
          </button>
        )}
      </div>
    </div>
  );
}
