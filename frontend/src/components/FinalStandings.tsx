import React, { useState } from 'react';
import { Standing, Room } from '../types';

interface FinalStandingsProps {
  standings: Standing[];
  room: Room | null;
  onClose: () => void;
}

export default function FinalStandings({ 
  standings, 
  room, 
  onClose 
}: FinalStandingsProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

  const togglePlayer = (id: string) => {
    const next = new Set(selectedPlayers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPlayers(next);
  };

  const totalNet = standings.reduce((sum, s) => sum + s.net, 0);
  const isBalanced = totalNet === 0;

  const selectedNet = Array.from(selectedPlayers).reduce((sum, id) => {
    const s = standings.find(st => st.player_id === id);
    return sum + (s?.net || 0);
  }, 0);

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-center text-white mb-1">🏆 最终结算</h2>
      
      {/* 总体平账检查 */}
      <div className={`mt-2 mb-4 p-2 rounded-lg text-center text-sm font-medium ${isBalanced ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
        {isBalanced ? '✅ 账目已平 (总净胜负: 0)' : `⚠️ 账目不平 (总净胜负: ${totalNet})`}
      </div>

      <p className="text-center text-xs text-slate-400 mb-2">点击玩家可合并计算选中者的总净胜负</p>
      
      {/* 多人合并计算面板 */}
      {selectedPlayers.size > 1 && (
        <div className="mb-4 p-3 rounded-xl bg-blue-900/40 border border-blue-700/50 flex justify-between items-center">
          <span className="text-sm text-blue-300">已选 {selectedPlayers.size} 人合并净胜负:</span>
          <span className={`text-lg font-bold ${selectedNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {selectedNet >= 0 ? '+' : ''}{selectedNet}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {standings.map((s: Standing, idx: number) => {
          const isSelected = selectedPlayers.has(s.player_id);
          return (
            <div 
              key={s.player_id} 
              onClick={() => togglePlayer(s.player_id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${
                isSelected ? 'border-blue-500 bg-blue-900/30' :
                idx === 0 ? 'border-yellow-500 bg-yellow-900/20' :
                s.net >= 0 ? 'border-green-700/50 bg-slate-800' : 'border-red-700/50 bg-slate-800'
              }`}
            >
              <span className="text-lg font-bold text-slate-400 w-6">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
              </span>
              <span className="text-xl">{s.player_emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white">{s.player_name}</span>
                <div className="text-[10px] text-slate-400">
                  筹码 {s.chips}
                  {s.total_rebuys > 0 && ` · 补码 ${s.total_rebuys * (room?.initial_chips || 0)}`}
                  {s.total_cashouts > 0 && ` · 清码 ${s.total_cashouts}`}
                </div>
              </div>
              <span className={`text-lg font-bold ${s.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {s.net >= 0 ? '+' : ''}{s.net}
              </span>
            </div>
          );
        })}
      </div>
      <button
        onClick={onClose}
        className="mt-6 w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold transition"
      >
        返回首页
      </button>
    </div>
  );
}
