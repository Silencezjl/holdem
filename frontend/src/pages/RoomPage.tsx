import React, { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { connectWs } from '../api';
import SeatGrid from '../components/SeatGrid';
import PlayerCards from '../components/PlayerCards';
import ActionPanel from '../components/ActionPanel';
import SettlementPanel from '../components/SettlementPanel';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const {
    playerId, room, connected,
    setRoom, setWs, setConnected, addEvent, setError, error, events,
  } = useStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!roomId || !playerId) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const socket = connectWs(roomId, playerId);

    socket.onopen = () => {
      setConnected(true);
      setError(null);
    };

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'room_state') {
          setRoom(data.room);
        } else if (data.type === 'event') {
          addEvent(data.event + (data.detail ? `: ${data.detail}` : ''));
        } else if (data.type === 'error') {
          setError(data.message);
          setTimeout(() => setError(null), 3000);
        }
      } catch { }
    };

    socket.onclose = () => {
      setConnected(false);
      // Auto-reconnect
      reconnectTimer.current = setTimeout(() => connect(), 2000);
    };

    socket.onerror = () => {
      setConnected(false);
    };

    wsRef.current = socket;
    setWs(socket);
  }, [roomId, playerId, setRoom, setWs, setConnected, addEvent, setError]);

  useEffect(() => {
    if (!playerId || !roomId) {
      navigate('/');
      return;
    }
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [playerId, roomId, connect, navigate]);

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const handleSit = (seat: number) => send({ type: 'sit', seat });
  const handleStand = () => send({ type: 'stand' });
  const handleReady = () => send({ type: 'ready' });
  const handleAction = (action: string, amount?: number) => {
    send({ type: 'action', action, amount: amount || 0 });
  };
  const handleSettle = (potWinners: Record<string, string[]>) => {
    send({ type: 'settle', pot_winners: potWinners });
  };
  const handleRebuy = () => send({ type: 'rebuy' });

  if (!room || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🃏</div>
          <p className="text-slate-400">连接房间中...</p>
        </div>
      </div>
    );
  }

  const myPlayer = room.players[playerId];
  const isWaiting = room.status === 'waiting';
  const isPlaying = room.status === 'playing';
  const isShowdown = room.hand?.phase === 'showdown';
  const isStreetComplete = room.hand?.street_complete === true;
  const isSeated = myPlayer?.seat >= 0;

  const canRebuy = isWaiting && myPlayer && myPlayer.chips <= room.rebuy_minimum;
  const handleNextStreet = () => send({ type: 'next_street' });

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white text-sm"
            >
              ← 退出
            </button>
            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-400">
              #{room.id}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>SB:{room.sb_amount}</span>
            <span>BB:{room.bb_amount}</span>
            <span className={connected ? 'text-green-400' : 'text-red-400'}>
              {connected ? '●' : '○'}
            </span>
          </div>
        </div>
        {room.hand_number > 0 && (
          <div className="text-center text-[10px] text-slate-500 mt-0.5">
            第 {room.hand_number} 手
          </div>
        )}
      </div>

      {/* Error bar */}
      {error && (
        <div className="mx-4 mt-2 px-3 py-2 bg-red-900/60 border border-red-700 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isWaiting && !room.hand?.phase ? (
          <>
            {/* Waiting state */}
            <div className="bg-slate-800/50 rounded-xl p-3 text-center">
              <p className="text-sm text-slate-400">
                初始筹码: <span className="text-white font-bold">{room.initial_chips}</span>
                {room.rebuy_minimum > 0 && (
                  <span className="ml-2">补码限额: <span className="text-white font-bold">≤{room.rebuy_minimum}</span></span>
                )}
                {room.rebuy_minimum === 0 && (
                  <span className="ml-2 text-slate-500">清零可补码</span>
                )}
              </p>
            </div>

            <SeatGrid
              room={room}
              playerId={playerId}
              onSit={handleSit}
              onStand={handleStand}
            />

            {/* Ready button & rebuy */}
            {isSeated && (
              <div className="space-y-2">
                <button
                  onClick={handleReady}
                  className={`w-full py-3 rounded-xl font-bold text-lg transition ${
                    myPlayer.ready
                      ? 'bg-green-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {myPlayer.ready ? '✓ 已准备 (点击取消)' : '准备'}
                </button>

                {canRebuy && (
                  <button
                    onClick={handleRebuy}
                    className="w-full py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-white font-medium transition"
                  >
                    补码 → {room.initial_chips}
                  </button>
                )}

                <div className="text-center text-sm text-slate-400">
                  我的筹码: <span className="font-bold text-green-400">{myPlayer.chips}</span>
                </div>
              </div>
            )}

            {/* Player count */}
            <div className="text-center text-xs text-slate-500">
              {Object.values(room.players).filter(p => p.seat >= 0).length} 人就座 ·
              {Object.values(room.players).filter(p => p.ready).length} 人准备 ·
              至少需要 2 人
            </div>
          </>
        ) : (
          <>
            {/* Playing state */}
            <PlayerCards room={room} playerId={playerId} />

            {isShowdown ? (
              <SettlementPanel
                room={room}
                playerId={playerId}
                onSettle={handleSettle}
              />
            ) : isStreetComplete ? (
              <div className="bg-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-1">
                    当前阶段 <span className="text-blue-400 font-bold uppercase">{room.hand?.phase}</span> 下注完成
                  </p>
                  <p className="text-xs text-slate-500">请在线下完成发牌后，点击下方按钮进入下一街</p>
                </div>
                <button
                  onClick={handleNextStreet}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-bold text-lg transition animate-pulse"
                >
                  🃏 进入下一街
                </button>
              </div>
            ) : isPlaying ? (
              <ActionPanel
                room={room}
                playerId={playerId}
                onAction={handleAction}
              />
            ) : null}

            {/* After hand end - back to waiting with rebuy option */}
            {isWaiting && room.hand?.phase && (
              <div className="space-y-2">
                {canRebuy && (
                  <button
                    onClick={handleRebuy}
                    className="w-full py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-white font-medium transition"
                  >
                    补码 → {room.initial_chips}
                  </button>
                )}
                <button
                  onClick={handleReady}
                  className={`w-full py-3 rounded-xl font-bold text-lg transition ${
                    myPlayer?.ready
                      ? 'bg-green-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {myPlayer?.ready ? '✓ 已准备' : '准备下一手'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Event log */}
      {events.length > 0 && (
        <div className="border-t border-slate-800 px-4 py-2 max-h-24 overflow-y-auto bg-slate-900/80">
          {events.slice(-5).map(evt => (
            <div key={evt.id} className="text-[10px] text-slate-500 py-0.5">
              {evt.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
