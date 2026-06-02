import { useState, useEffect, useRef } from 'react';
import { fetchLeaderboard, searchUsers } from '../lib/api';
import AdBanner from '../components/AdBanner';
import HowToPlayPage from './HowToPlayPage';

export default function LobbyPage({
  socket, username, onLogout,
  onRoomCreated, onRoomUpdate,
  activeRoomId, activeRoomTab, showRoomOnly,
  token,
}) {
  function sendInvite(toUsername) {
    socket.emit('send_invite', { toUsername });
  }
  const [joinInput, setJoinInput] = useState('');
  const [showHtp, setShowHtp] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const searchTimer = useRef(null);

  // Normalize player entries — may be strings (legacy) or objects
  function normalizePlayers(list) {
    if (!list) return [{ username, isBot: false, difficulty: null }];
    return list.map(p => typeof p === 'string' ? { username: p, isBot: p.startsWith('Bot '), difficulty: null } : p);
  }

  // Local room state for the active room tab
  const [roomPlayers, setRoomPlayers] = useState(normalizePlayers(activeRoomTab?.players));
  const [isHost, setIsHost] = useState(activeRoomTab?.isHost ?? false);

  useEffect(() => {
    if (!showRoomOnly) fetchLeaderboard(username).then(data => {
      setLeaderboard(data.rows || []);
      setMyRank(data.myRank || null);
    });
  }, [showRoomOnly]);

  useEffect(() => {
    if (activeRoomTab) {
      setRoomPlayers(normalizePlayers(activeRoomTab.players));
      setIsHost(activeRoomTab.isHost ?? false);
    }
  }, [activeRoomId]);

  useEffect(() => {
    socket.emit('request_online_users');
    socket.on('online_users', users => setOnlineUsers(new Set(users)));
    return () => socket.off('online_users');
  }, [socket]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      searchUsers(token, searchQuery).then(results => {
        setSearchResults(results.map(r => ({
          ...r,
          online: onlineUsers.has(r.username),
        })));
      });
    }, 300);
  }, [searchQuery, token, onlineUsers]);

  useEffect(() => {
    socket.on('room_update', ({ players, hostUsername }) => {
      setRoomPlayers(normalizePlayers(players));
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

  const [botDifficulty, setBotDifficulty] = useState('medium');
  function startGame() { socket.emit('start_game', { roomId: activeRoomId }); }
  function addBot() { socket.emit('add_bot', { roomId: activeRoomId, difficulty: botDifficulty }); }
  function removeBot() { socket.emit('remove_bot', { roomId: activeRoomId }); }

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
            {roomPlayers.map(p => (
              <li key={p.username}>
                {p.isBot ? '🤖 ' : ''}{p.username}
                {p.isBot && p.difficulty && (
                  <span className={`difficulty-badge difficulty-${p.difficulty}`}>{p.difficulty}</span>
                )}
                {p.username === username ? ' (you)' : ''}
              </li>
            ))}
          </ul>
          {isHost && (
            <div className="add-bot-row">
              <select
                className="difficulty-select"
                value={botDifficulty}
                onChange={e => setBotDifficulty(e.target.value)}
                disabled={roomPlayers.length >= 4}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="demanding">Demanding</option>
              </select>
              <button onClick={addBot} className="secondary-btn" disabled={roomPlayers.length >= 4}>+ Add Bot</button>
              {roomPlayers.some(p => p.isBot) && (
                <button onClick={removeBot} className="secondary-btn">− Remove Bot</button>
              )}
            </div>
          )}
          {isHost && roomPlayers.length >= 2 && (
            <button onClick={startGame} className="primary-btn room-btn">Start Game</button>
          )}
          {isHost && roomPlayers.length < 2 && (
            <p className="hint">Waiting for more players… (min 2)</p>
          )}
          {!isHost && <p className="hint">Waiting for host to start…</p>}
          {isHost && roomPlayers.some(p => p.isBot) && (
            <p className="hint" style={{ fontSize: 11, opacity: 0.6 }}>Practice games with bots don't count toward rankings.</p>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  // Full lobby view
  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <span className="lobby-welcome">Welcome, <strong>{username}</strong></span>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      <div className="lobby-content">
        <div className="room-panel">
          <h2>Play</h2>
          <button onClick={createRoom} className="primary-btn">Start New Game</button>
          <div className="join-row">
            <input
              placeholder="ENTER ROOM CODE"
              value={joinInput}
              onChange={e => setJoinInput(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button onClick={joinRoom}>Join</button>
          </div>
          {error && <p className="error">{error}</p>}
          <button
            className="htp-toggle-btn"
            onClick={() => setShowHtp(v => !v)}
          >
            {showHtp ? '▲ Hide How to Play' : '▼ How to Play'}
          </button>
          {showHtp && (
            <div className="htp-inline">
              <HowToPlayPage />
            </div>
          )}
        </div>

        <div className="room-panel">
          <h2>Find Players</h2>
          <input
            placeholder="Search by username…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <ul className="player-list">
              {searchResults.map(r => {
                const isOnline = onlineUsers.has(r.username);
                const isMe = r.username === username;
                return (
                  <li key={r.username} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                      background: isOnline ? '#2a9d4e' : '#ccc',
                      display: 'inline-block',
                    }} />
                    <span style={{ flex: 1 }}>{r.username}{isMe ? ' (you)' : ''}</span>
                    {isOnline && !isMe && (
                      <button
                        onClick={() => sendInvite(r.username)}
                        style={{ background: '#2a9d4e', color: 'white', padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6 }}
                      >Play</button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="leaderboard-panel">
          <h2>Leaderboard</h2>
          <p className="hint" style={{ marginBottom: 8 }}>{onlineUsers.size} player{onlineUsers.size !== 1 ? 's' : ''} online</p>

          {/* Scrollable top-50 table, visually capped at 10 rows */}
          <div className="leaderboard-scroll">
            <table>
              <thead><tr><th>#</th><th>Player</th><th>W</th><th>L</th><th>Score</th><th>Rating</th><th></th></tr></thead>
              <tbody>
                {leaderboard.map((row, i) => {
                  const isOnline = onlineUsers.has(row.username);
                  const isMe = row.username === username;
                  return (
                    <tr key={row.username} className={isMe ? 'me' : ''}>
                      <td>{i + 1}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: isOnline ? '#2a9d4e' : '#ccc',
                            display: 'inline-block',
                          }} />
                          {row.username}
                        </span>
                      </td>
                      <td>{row.wins}</td>
                      <td>{row.losses}</td>
                      <td>{row.total_score}</td>
                      <td>{row.elo_rating ?? 1200}</td>
                      <td>
                        {isOnline && !isMe && (
                          <button
                            onClick={() => sendInvite(row.username)}
                            style={{ background: '#2a9d4e', color: 'white', padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6 }}
                          >Play</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {leaderboard.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', opacity: 0.5 }}>No games yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pinned: current user's rank (shown if they're in the leaderboard) */}
          {myRank && (
            <div className="leaderboard-my-rank">
              <table>
                <tbody>
                  <tr className="me">
                    <td>#{myRank.rank}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2a9d4e', display: 'inline-block' }} />
                        {username} <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 2 }}>(you)</span>
                      </span>
                    </td>
                    <td>{myRank.wins}</td>
                    <td>{myRank.losses}</td>
                    <td>{myRank.total_score}</td>
                    <td>{myRank.elo_rating ?? 1200}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <AdBanner variant="leaderboard" />
        </div>
      </div>
    </div>
  );
}
