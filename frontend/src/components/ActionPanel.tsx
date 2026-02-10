import React, { useState, useMemo } from 'react';
import { Room } from '../types';

interface Props {
  room: Room;
  playerId: string;
  onAction: (action: string, amount?: number) => void;
}

export default function ActionPanel({ room, playerId, onAction }: Props) {
  const [showRaise, setShowRaise] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);

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
    const twoBB = bb * 2 + currentBet;
    if (twoBB <= myChips + myBet) items.push({ label: '2BB', amount: twoBB });
    const halfPot = Math.floor(pot / 2) + currentBet;
    if (halfPot > currentBet && halfPot <= myChips + myBet) items.push({ label: '1/2 Pot', amount: halfPot });
    const fullPot = pot + currentBet;
    if (fullPot > currentBet && fullPot <= myChips + myBet) items.push({ label: 'Pot', amount: fullPot });
    return items;
  }, [hand, bb, currentBet, myChips, myBet]);

  if (!hand || !player) return null;

  const isMyTurn = hand.current_player_id === playerId;
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all_in';
  const callAmount = currentBet - myBet;

  const canCheck = currentBet <= myBet;
  const canCall = callAmount > 0 && callAmount <= myChips;
  const minRaise = currentBet + bb;

  if (isFolded || isAllIn) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 text-center">
        <p className="text-slate-400 text-sm">
          {isFolded ? '你已弃牌 (Fold)' : `你已全押 (All-In) - 筹码: ${player.current_bet}`}
        </p>
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">等待其他玩家行动...</span>
          <span className="text-sm font-bold text-green-400">💰 {myChips}</span>
        </div>
      </div>
    );
  }

  if (showRaise) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">加注到</span>
          <button onClick={() => setShowRaise(false)} className="text-slate-400 hover:text-white text-sm">
            ✕ 取消
          </button>
        </div>

        {/* Quick raise buttons */}
        <div className="flex gap-2 flex-wrap">
          {quickRaises.map(q => (
            <button
              key={q.label}
              onClick={() => setRaiseAmount(q.amount)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                raiseAmount === q.amount
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {q.label} ({q.amount})
            </button>
          ))}
        </div>

        {/* Slider */}
        <div>
          <input
            type="range"
            min={minRaise}
            max={myChips + myBet}
            value={raiseAmount || minRaise}
            onChange={e => setRaiseAmount(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{minRaise}</span>
            <span className="text-lg font-bold text-white">{raiseAmount || minRaise}</span>
            <span>{myChips + myBet}</span>
          </div>
        </div>

        {/* Number input */}
        <input
          type="number"
          value={raiseAmount || minRaise}
          onChange={e => {
            const v = parseInt(e.target.value) || minRaise;
            setRaiseAmount(Math.min(Math.max(v, minRaise), myChips + myBet));
          }}
          className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white text-center text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={() => {
            const amt = raiseAmount || minRaise;
            onAction('raise', amt);
            setShowRaise(false);
            setRaiseAmount(0);
          }}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold text-lg transition"
        >
          确认加注 → {raiseAmount || minRaise}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-3">
      {/* Chips info */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-slate-400">我的筹码</span>
        <span className="text-lg font-bold text-green-400">💰 {myChips}</span>
      </div>
      {myBet > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-slate-400">本轮已下注</span>
          <span className="text-sm font-bold text-orange-400">{myBet}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onAction('fold')}
          className="py-3 bg-red-900/60 hover:bg-red-800 border border-red-700 rounded-xl text-red-300 font-bold transition"
        >
          Fold
        </button>

        {canCheck ? (
          <button
            onClick={() => onAction('check')}
            className="py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-white font-bold transition"
          >
            Check
          </button>
        ) : canCall ? (
          <button
            onClick={() => onAction('call')}
            className="py-3 bg-green-900/60 hover:bg-green-800 border border-green-700 rounded-xl text-green-300 font-bold transition"
          >
            Call {callAmount}
          </button>
        ) : null}

        <button
          onClick={() => {
            setRaiseAmount(minRaise);
            setShowRaise(true);
          }}
          disabled={myChips <= callAmount}
          className="py-3 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 rounded-xl text-blue-300 font-bold transition disabled:opacity-40"
        >
          Raise
        </button>

        <button
          onClick={() => onAction('all_in')}
          className="py-3 bg-purple-900/60 hover:bg-purple-800 border border-purple-700 rounded-xl text-purple-300 font-bold transition"
        >
          All-In ({myChips})
        </button>
      </div>
    </div>
  );
}
