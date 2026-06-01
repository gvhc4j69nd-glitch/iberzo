import { useState, useEffect } from 'react';
import { fetchLeaderboard } from '../lib/api';

export default function LobbyPage({
  socket, username, onLogout,
  onRoomCreated, onRoomUpdate,
  activeRoomId, activeRoomTab, showRoomOnly,
}) {
  const [joinInput, setJoinInput] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Local room state for the active room tab
  const [roomPlayers, setRoomPlayers] = useState(activeRoomTab?.players || [username]);
  const [isHost, setIsHost] = useState(activeRoomTab?.isHost ?? false);

  useEffect(() => {
    if (!showRoomOnly) fetchLeaderboard().then(setLeaderboard);
  }, [showRoomOnly]);

  useEffect(() => {
    if (activeRoomTab) {
      setRoomPlayers(activeRoomTab.players || [username]);
      setIsHost(activeRoomTab.isHost ?? false);
    }
  }, [activeRoomId]);

  useEffect(() => {
    socket.on('room_update', ({ players, hostUsername }) => {
      setRoomPlayers(players);
      const newIsHost = hostUsername === username;
      setIsHost(newIsHost);
      if (activeRoomId) {
        onRoomUpdate?.(activeRoomId, players, hostUsername, newIsHost);
      }
    });
    socket.on('game_error', setError);
    return () => { socket.off('room_update'); socket.off('game_error'); };
  }, [socket, username, activeRoomId]);

  function createRoom() {
    socket.once('room_created', ({ roomId }) => {
      onRoomCreated?.(roomId, true, [username], username);
    });
    socket.emit('create_room');
  }

  function joinRoom() {
    const id = joinInput.toUpperCase().trim();
    if (!id) return;
    socket.once('room_update', ({ players, hostUsername }) => {
      onRoomCreated?.(id, hostUsername === username, players, hostUsername);
    });
    socket.emit('join_room', { roomId: id });
    setJoinInput('');
  }

  function startGame() { socket.emit('start_game', { roomId: activeRoomId }); }

  function copyCode() {
    navigator.clipboard.writeText(activeRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Room-only view (shown when a waiting room tab is selected)
  if (showRoomOnly && activeRoomTab) {
    return (
      <div className="lobby-page">
        <div className="room-panel" style={{ maxWidth: 400, margin: '24px auto' }}>
          <h2>Room</h2>
          <div className="room-code-row">
            <code>{activeRoomId}</code>
            <button className="copy-btn" onClick={copyCode}>{copied ? '✓ Copied' : 'Copy'}</button>
          </div>
          <p className="hint">Share this code — room stays open until you close it</p>
          <ul className="player-list">
            {roomPlayers.map(p => <li key={p}>{p}{p === username ? ' (you)' : ''}</li>)}
          </ul>
          {isHost && roomPlayers.length >= 2 && (
            <button onClick={startGame} className="primary-btn room-btn">Start Game</button>
          )}
          {isHost && roomPlayers.length < 2 && (
            <p className="hint">Waiting for more players… (min 2)</p>
          )}
          {!isHost && <p className="hint">Waiting for host to start…</p>}
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  // Full lobby view
  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <img src="/iberzo-logo.png" alt="Iberzo" style={{ height: 110, objectFit: 'contain' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span>Welcome, {username}</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="lobby-content">
        <div className="room-panel">
          <h2>Play</h2>
          <button onClick={createRoom} className="primary-btn">Create Room</button>
          <div className="join-row">
            <input
              placeholder="Room code"
              value={joinInput}
              onChange={e => setJoinInput(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button onClick={joinRoom}>Join</button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="leaderboard-panel">
          <h2>Leaderboard</h2>
          <table>
            <thead><tr><th>#</th><th>Player</th><th>W</th><th>L</th><th>Score</th></tr></thead>
            <tbody>
              {leaderboard.map((row, i) => (
                <tr key={row.username} className={row.username === username ? 'me' : ''}>
                  <td>{i + 1}</td>
                  <td>{row.username}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.total_score}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', opacity: 0.5 }}>No games yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
