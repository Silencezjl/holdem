import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { createRoom, joinRoom, fetchRooms, getRandomProfile } from '../api';
import { RoomListItem } from '../types';

const EMOJIS = [
  '😀','😎','🤠','🦊','🐱','🐶','🐼','🦁','🐯','🐸',
  '🐵','🦄','🐲','🦅','🐧','🐨','🐰','🐷','🦋','🌟',
  '🔥','💎','🎯','🎲','👑','🃏','♠️','♥️','♦️','♣️',
];

type Tab = 'create' | 'join';

export default function HomePage() {
  const navigate = useNavigate();
  const { setPlayer, setRoomId, reset } = useStore();
  const [tab, setTab] = useState<Tab>('create');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [sb, setSb] = useState(10);
  const [initialChips, setInitialChips] = useState(1000);
  const [rebuyMin, setRebuyMin] = useState(0);
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const initProfile = useCallback(async () => {
    try {
      const p = await getRandomProfile();
      setName(p.name);
      setEmoji(p.emoji);
    } catch {
      setName('Player_' + Math.floor(Math.random() * 99));
      setEmoji('😀');
    }
  }, []);

  useEffect(() => {
    reset();
    initProfile();
  }, [initProfile, reset]);

  const loadRooms = useCallback(async () => {
    try {
      const data = await fetchRooms();
      setRooms(data);
    } catch { }
  }, []);

  useEffect(() => {
    if (tab === 'join') {
      loadRooms();
      const interval = setInterval(loadRooms, 3000);
      return () => clearInterval(interval);
    }
  }, [tab, loadRooms]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await createRoom({
        player_name: name.trim(),
        player_emoji: emoji,
        sb_amount: sb,
        initial_chips: initialChips,
        rebuy_minimum: rebuyMin,
      });
      setPlayer(res.player_id, name.trim(), emoji);
      setRoomId(res.room_id);
      navigate(`/room/${res.room_id}`);
    } catch (e: any) {
      alert('创建失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (roomId: string) => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await joinRoom({
        room_id: roomId,
        player_name: name.trim(),
        player_emoji: emoji,
      });
      setPlayer(res.player_id, name.trim(), emoji);
      setRoomId(res.room_id);
      navigate(`/room/${res.room_id}`);
    } catch (e: any) {
      alert('加入失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">🃏 Holdem Chips</h1>
        <p className="text-slate-400 text-sm">线下德扑筹码管理平台</p>
      </div>

      {/* Profile */}
      <div className="w-full bg-slate-800 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-4xl w-14 h-14 flex items-center justify-center bg-slate-700 rounded-full hover:bg-slate-600 transition"
          >
            {emoji}
          </button>
          <input
            className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="你的昵称"
            maxLength={20}
          />
          <button
            onClick={initProfile}
            className="text-slate-400 hover:text-white p-2"
            title="随机"
          >
            🎲
          </button>
        </div>
        {showEmojiPicker && (
          <div className="grid grid-cols-10 gap-1 mt-3 p-2 bg-slate-700 rounded-lg">
            {EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                className={`text-xl p-1 rounded hover:bg-slate-600 ${emoji === e ? 'bg-blue-600' : ''}`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="w-full flex mb-4 bg-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setTab('create')}
          className={`flex-1 py-3 text-center font-semibold transition ${
            tab === 'create' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          🏠 创建房间
        </button>
        <button
          onClick={() => setTab('join')}
          className={`flex-1 py-3 text-center font-semibold transition ${
            tab === 'join' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          🚪 加入房间
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'create' ? (
        <div className="w-full bg-slate-800 rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">小盲注 (SB)</label>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 25, 50, 100].map(v => (
                <button
                  key={v}
                  onClick={() => setSb(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    sb === v ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">大盲注 BB = {sb * 2}</p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">初始筹码</label>
            <div className="flex gap-2 flex-wrap">
              {[500, 1000, 2000, 5000, 10000].map(v => (
                <button
                  key={v}
                  onClick={() => setInitialChips(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    initialChips === v ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">补码限额（筹码低于此值可补码，0=清零才能补）</label>
            <input
              type="number"
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={rebuyMin}
              onChange={e => setRebuyMin(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-xl text-white font-bold text-lg transition"
          >
            {loading ? '创建中...' : '创建房间'}
          </button>
        </div>
      ) : (
        <div className="w-full space-y-3">
          {rooms.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-500">
              <p className="text-4xl mb-2">🏜️</p>
              <p>暂无可加入的房间</p>
              <p className="text-xs mt-1">等待房间创建中...</p>
            </div>
          ) : (
            rooms.map(r => (
              <div key={r.id} className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{r.owner_emoji}</span>
                    <span className="font-semibold text-white">{r.owner_name}</span>
                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-400">#{r.id}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span>SB: {r.sb_amount}</span>
                    <span>BB: {r.bb_amount}</span>
                    <span>底池: {r.initial_chips}</span>
                    <span>👥 {r.player_count}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleJoin(r.id)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition"
                >
                  加入
                </button>
              </div>
            ))
          )}
          <button
            onClick={loadRooms}
            className="w-full py-2 text-slate-400 hover:text-white text-sm transition"
          >
            🔄 刷新列表
          </button>
        </div>
      )}
    </div>
  );
}
