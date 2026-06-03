import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../lib/api';

const TYPE_ICON = {
  system:         '📢',
  friend_request: '👥',
  game_invite:    '🎮',
};

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60)   return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function NotificationBell({ socket, token, username, onJoinRoom }) {
  const [count, setCount]           = useState(0);
  const [open, setOpen]             = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected]     = useState(null); // detail view
  const [loading, setLoading]       = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
        setSelected(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const reload = useCallback(async () => {
    if (!token) return;
    const data = await fetchNotifications(token);
    if (Array.isArray(data)) {
      setNotifications(data);
      setCount(data.filter(n => !n.read).length);
    }
  }, [token]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    const onCount = ({ count: c }) => setCount(c);
    const onPushed = (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setCount(notif.count ?? (c => c + 1));
    };
    socket.on('notification_count', onCount);
    socket.on('notification_pushed', onPushed);
    return () => {
      socket.off('notification_count', onCount);
      socket.off('notification_pushed', onPushed);
    };
  }, [socket]);

  async function openPanel() {
    setOpen(o => !o);
    setSelected(null);
    if (!open) {
      setLoading(true);
      await reload();
      setLoading(false);
    }
  }

  async function openDetail(notif) {
    setSelected(notif);
    if (!notif.read) {
      await markNotificationRead(token, notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      setCount(c => Math.max(0, c - 1));
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(token);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setCount(0);
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    await deleteNotification(token, id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function handleAcceptFriend() {
    if (!selected?.data?.fromUsername) return;
    socket.emit('accept_friend_request', { fromUsername: selected.data.fromUsername });
    handleDelete({ stopPropagation: () => {} }, selected.id);
    setSelected(null);
  }

  function handleDeclineFriend() {
    if (!selected?.data?.fromUsername) return;
    socket.emit('decline_friend_request', { fromUsername: selected.data.fromUsername });
    handleDelete({ stopPropagation: () => {} }, selected.id);
    setSelected(null);
  }

  function handleAcceptGame() {
    if (!selected?.data?.inviteId) return;
    socket.emit('respond_game_invite', { inviteId: selected.data.inviteId, accept: true });
    handleDelete({ stopPropagation: () => {} }, selected.id);
    setSelected(null);
    setOpen(false);
  }

  function handleDeclineGame() {
    if (!selected?.data?.inviteId) return;
    socket.emit('respond_game_invite', { inviteId: selected.data.inviteId, accept: false });
    handleDelete({ stopPropagation: () => {} }, selected.id);
    setSelected(null);
  }

  return (
    <div className="notif-wrap" ref={panelRef}>
      {/* Bell button */}
      <button className={`notif-bell ${open ? 'open' : ''}`} onClick={openPanel} aria-label="Notifications">
        🔔
        {count > 0 && <span className="notif-badge">{count > 99 ? '99+' : count}</span>}
      </button>

      {/* Panel */}
      {open && (
        <div className="notif-panel">
          {selected ? (
            /* ── Detail view ── */
            <div className="notif-detail">
              <div className="notif-panel-header">
                <button className="notif-back" onClick={() => setSelected(null)}>← Back</button>
                <button className="notif-del-btn" onClick={e => handleDelete(e, selected.id)}>Delete</button>
              </div>
              <div className="notif-detail-body">
                <div className="notif-detail-icon">{TYPE_ICON[selected.type] || '📌'}</div>
                <h3 className="notif-detail-subject">{selected.subject}</h3>
                <p className="notif-detail-time">{timeAgo(selected.created_at)}</p>
                {selected.body && <p className="notif-detail-text">{selected.body}</p>}

                {/* Friend request actions */}
                {selected.type === 'friend_request' && (
                  <div className="notif-actions">
                    <button className="notif-action-btn accept" onClick={handleAcceptFriend}>✓ Accept</button>
                    <button className="notif-action-btn decline" onClick={handleDeclineFriend}>✕ Decline</button>
                  </div>
                )}

                {/* Game invite actions */}
                {selected.type === 'game_invite' && selected.data?.inviteId && (
                  <div className="notif-actions">
                    <button className="notif-action-btn accept" onClick={handleAcceptGame}>🎮 Join Game</button>
                    <button className="notif-action-btn decline" onClick={handleDeclineGame}>✕ Decline</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── List view ── */
            <>
              <div className="notif-panel-header">
                <span className="notif-panel-title">Notifications</span>
                {notifications.some(n => !n.read) && (
                  <button className="notif-read-all" onClick={handleMarkAllRead}>Mark all read</button>
                )}
              </div>
              {loading ? (
                <div className="notif-empty">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="notif-empty">No notifications yet</div>
              ) : (
                <ul className="notif-list">
                  {notifications.map(n => (
                    <li key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => openDetail(n)}>
                      <span className="notif-item-icon">{TYPE_ICON[n.type] || '📌'}</span>
                      <div className="notif-item-body">
                        <span className="notif-item-subject">{n.subject}</span>
                        <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                      </div>
                      {!n.read && <span className="notif-unread-dot" />}
                      <button className="notif-item-del" onClick={e => handleDelete(e, n.id)}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
