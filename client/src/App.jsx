import { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import AccountPage from './pages/AccountPage';
import HowToPlayPage from './pages/HowToPlayPage';
import FriendsPage from './pages/FriendsPage';
import NavMenu from './components/NavMenu';
import { getSocket, disconnectSocket } from './lib/socket';
import { fetchMyRooms } from './lib/api';
import './App.css';

// tab: { roomId, status: 'waiting'|'active', state, players, hostUsername, isHost }

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [username, setUsername] = useState(() => localStorage.getItem('username'));
  const [socket, setSocket] = useState(null);
  const [tabs, setTabs] = useState({}); // { [roomId]: tab }
  const [currentTab, setCurrentTab] = useState(null); // roomId or 'lobby'
  const [unread, setUnread] = useState(new Set());
  const [incomingInvite, setIncomingInvite] = useState(null); // { fromUsername }
  const [navPage, setNavPage] = useState(null); // 'account' | 'howtoplay' | 'friends'

  // Restore tabs from server on login
  useEffect(() => {
    if (!token) return;
    fetchMyRooms(token).then(rooms => {
      if (!rooms?.length) return;
      const restored = {};
      rooms.forEach(r => {
        restored[r.roomId] = {
          roomId: r.roomId,
          status: r.roomStatus,
          state: r.state,
          players: r.players,
          hostUsername: r.hostUsername,
          isHost: r.isHost,
        };
      });
      setTabs(restored);
    });
  }, [token]);

  // Wire socket events
  useEffect(() => {
    if (!token) return;
    const s = getSocket(token);
    setSocket(s);

    const onConnect = () => {
      fetchMyRooms(token).then(rooms => {
        if (!rooms?.length) return;
        setTabs(prev => {
          const next = { ...prev };
          rooms.forEach(r => {
            next[r.roomId] = { ...next[r.roomId], roomId: r.roomId, status: r.roomStatus, state: r.state, players: r.players, hostUsername: r.hostUsername, isHost: r.isHost };
          });
          return next;
        });
      });
    };
    const onGameStarted = ({ roomId, state }) => {
      setTabs(t => ({ ...t, [roomId]: { ...t[roomId], status: 'active', state } }));
      setCurrentTab(roomId);
    };
    const onGameUpdate = ({ roomId, state }) => {
      setTabs(t => ({ ...t, [roomId]: { ...t[roomId], state } }));
      setUnread(u => {
        if (currentTab === roomId) return u;
        const next = new Set(u); next.add(roomId); return next;
      });
    };
    const onRoomUpdate = ({ roomId, players, hostUsername }) => {
      if (!roomId) return;
      const isHost = hostUsername === username;
      setTabs(t => t[roomId] ? { ...t, [roomId]: { ...t[roomId], players, hostUsername, isHost } } : t);
    };
    const onGameOver = () => {};
    const onGameAbandoned = () => {};
    const onInviteReceived = ({ fromUsername }) => setIncomingInvite({ fromUsername });
    const onInviteAccepted = ({ roomId, players, hostUsername }) => {
      const isHost = hostUsername === username;
      setTabs(t => ({ ...t, [roomId]: { roomId, status: 'waiting', state: null, players, hostUsername, isHost } }));
      setCurrentTab(roomId);
      setIncomingInvite(null);
    };
    const onInviteRejected = ({ byUsername }) => {
      alert(`${byUsername} declined your invite.`);
    };

    s.on('connect', onConnect);
    s.on('game_started', onGameStarted);
    s.on('game_update', onGameUpdate);
    s.on('room_update', onRoomUpdate);
    s.on('game_over', onGameOver);
    s.on('game_abandoned', onGameAbandoned);
    s.on('invite_received', onInviteReceived);
    s.on('invite_accepted', onInviteAccepted);
    s.on('invite_rejected', onInviteRejected);

    return () => {
      s.off('connect', onConnect);
      s.off('game_started', onGameStarted);
      s.off('game_update', onGameUpdate);
      s.off('room_update', onRoomUpdate);
      s.off('game_over', onGameOver);
      s.off('game_abandoned', onGameAbandoned);
      s.off('invite_received', onInviteReceived);
      s.off('invite_accepted', onInviteAccepted);
      s.off('invite_rejected', onInviteRejected);
    };
  }, [token, username]);

  function handleAuth(newToken, newUsername) {
    setToken(newToken);
    setUsername(newUsername);
    setSocket(getSocket(newToken));
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    disconnectSocket();
    setToken(null); setUsername(null); setSocket(null);
    setTabs({}); setCurrentTab(null);
  }

  function addTab(roomId, isHost, players, hostUsername) {
    setTabs(t => ({
      ...t,
      [roomId]: { roomId, status: 'waiting', state: null, players, hostUsername, isHost },
    }));
    setCurrentTab(roomId);
  }

  function updateTabPlayers(roomId, players, hostUsername, isHost) {
    setTabs(t => t[roomId] ? { ...t, [roomId]: { ...t[roomId], players, hostUsername, isHost } } : t);
  }

  function closeTab(roomId) {
    if (socket) socket.emit('leave_game', { roomId });
    setTabs(t => { const next = { ...t }; delete next[roomId]; return next; });
    if (currentTab === roomId) setCurrentTab(null);
  }

  function switchTab(id) {
    setCurrentTab(id);
    setUnread(u => { const next = new Set(u); next.delete(id); return next; });
  }

  if (!token) return <AuthPage onAuth={handleAuth} />;
  if (!socket) return <div className="loading">Connecting…</div>;

  const tabIds = Object.keys(tabs);
  const activeTab = currentTab && tabs[currentTab] ? tabs[currentTab] : null;
  const showGame = activeTab?.status === 'active' && activeTab?.state;

  function acceptInvite() {
    if (!incomingInvite) return;
    socket.emit('accept_invite', { fromUsername: incomingInvite.fromUsername });
  }

  function rejectInvite() {
    if (!incomingInvite) return;
    socket.emit('reject_invite', { fromUsername: incomingInvite.fromUsername });
    setIncomingInvite(null);
  }

  return (
    <div className="app-shell">
      {incomingInvite && (
        <div className="invite-overlay">
          <div className="invite-card">
            <p><strong>{incomingInvite.fromUsername}</strong> wants to play a game!</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="primary-btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={acceptInvite}>Accept</button>
              <button className="close-room-btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={rejectInvite}>Decline</button>
            </div>
          </div>
        </div>
      )}
      <div className="game-nav">
        <img src="/iberzo-logo.png" alt="Iberzo" style={{ height: 60, objectFit: 'contain', flexShrink: 0 }} />
        <button
          className={`game-nav-tab ${!currentTab ? 'active' : ''}`}
          onClick={() => switchTab(null)}
        >Lobby</button>
        {tabIds.map(id => {
          const tab = tabs[id];
          const isActive = currentTab === id;
          return (
            <div key={id} className={`game-nav-tab-wrap ${isActive ? 'active' : ''}`}>
              <button
                className={`game-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => switchTab(id)}
              >
                {tab.status === 'active' ? `Game ${id}` : `Room ${id}`}
                {tab.status === 'active' && <span className="tab-status-dot playing" />}
                {tab.status === 'waiting' && <span className="tab-status-dot waiting" />}
                {unread.has(id) && <span className="unread-dot" />}
              </button>
              <button className="tab-close-btn" onClick={() => closeTab(id)}>✕</button>
            </div>
          );
        })}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <NavMenu onSelect={setNavPage} />
        </div>
      </div>

      {navPage && (
        <div className="nav-page-overlay">
          {navPage === 'account' && (
            <AccountPage username={username} token={token} onClose={() => setNavPage(null)} />
          )}
          {navPage === 'howtoplay' && (
            <HowToPlayPage onClose={() => setNavPage(null)} />
          )}
          {navPage === 'friends' && (
            <FriendsPage onClose={() => setNavPage(null)} />
          )}
        </div>
      )}

      {currentTab && activeTab ? (
        showGame ? (
          <GamePage
            key={currentTab}
            socket={socket}
            username={username}
            roomId={currentTab}
            initialState={activeTab.state}
            onGameOver={() => {}} // handled via game_over socket event
            onLeave={() => closeTab(currentTab)}
            onAbandoned={() => {}}
          />
        ) : (
          // Waiting room view — reuse LobbyPage's room panel via prop
          <LobbyPage
            socket={socket}
            token={token}
            username={username}
            onLogout={handleLogout}
            onRoomCreated={(roomId, isHost, players, hostUsername) => addTab(roomId, isHost, players, hostUsername)}
            onRoomUpdate={(roomId, players, hostUsername, isHost) => updateTabPlayers(roomId, players, hostUsername, isHost)}
            activeRoomId={currentTab}
            activeRoomTab={activeTab}
            showRoomOnly
          />
        )
      ) : (
        <LobbyPage
          socket={socket}
          token={token}
          username={username}
          onLogout={handleLogout}
          onRoomCreated={(roomId, isHost, players, hostUsername) => addTab(roomId, isHost, players, hostUsername)}
          onRoomUpdate={(roomId, players, hostUsername, isHost) => updateTabPlayers(roomId, players, hostUsername, isHost)}
        />
      )}
    </div>
  );
}
