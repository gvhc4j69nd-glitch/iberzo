import { useState, useEffect, useCallback } from 'react';
import { fetchFriends } from '../lib/api';

export default function FriendsPage({ onClose, socket, token, username, onJoinRoom }) {
  const [data, setData] = useState({ friends: [], incoming: [], outgoing: [] });
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [friendError, setFriendError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const reload = useCallback(() => {
    fetchFriends(token).then(d => {
      if (!d.error) setData(d);
    });
  }, [token]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('request_online_users');
    const onOnline = (users) => setOnlineUsers(new Set(users));
    const onUpdated = () => reload();
    const onError = (msg) => setFriendError(msg);
    const onJoined = ({ roomId }) => { onJoinRoom?.(roomId); onClose(); };
    socket.on('online_users', onOnline);
    socket.on('friends_updated', onUpdated);
    socket.on('friend_error', onError);
    socket.on('game_invite_joined', onJoined);
    return () => {
      socket.off('online_users', onOnline);
      socket.off('friends_updated', onUpdated);
      socket.off('friend_error', onError);
      socket.off('game_invite_joined', onJoined);
    };
  }, [socket, reload, onClose, onJoinRoom]);

  function acceptRequest(fromUsername) {
    socket.emit('accept_friend_request', { fromUsername });
    setFriendError('');
  }
  function declineRequest(fromUsername) {
    socket.emit('decline_friend_request', { fromUsername });
    setFriendError('');
  }
  function removeFriend(friendUsername) {
    if (!confirm(`Remove ${friendUsername} from friends?`)) return;
    socket.emit('remove_friend', { friendUsername });
  }

  return (
    <div className="nav-page">
      <div className="nav-page-header">
        <h2>Friends</h2>
        <button className="nav-page-close" onClick={onClose}>✕</button>
      </div>
      <div className="nav-page-body" style={{ padding: '0 16px 16px' }}>
        {toast && <div className="friend-toast">{toast}</div>}
        {friendError && <p className="error" style={{ marginTop: 8 }}>{friendError}</p>}

        {/* Incoming requests */}
        {data.incoming.length > 0 && (
          <section className="friend-section">
            <h3 className="friend-section-title">Friend Requests ({data.incoming.length})</h3>
            <ul className="friend-list">
              {data.incoming.map(r => (
                <li key={r.id || r.requesterId} className="friend-item">
                  <span className="friend-name">{r.username}</span>
                  <div className="friend-actions">
                    <button className="friend-btn accept" onClick={() => acceptRequest(r.username)}>Accept</button>
                    <button className="friend-btn decline" onClick={() => declineRequest(r.username)}>Decline</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Friends list */}
        <section className="friend-section">
          <h3 className="friend-section-title">Friends ({data.friends.length})</h3>
          {data.friends.length === 0 ? (
            <p className="friend-empty">No friends yet — search for players in the lobby to add them.</p>
          ) : (
            <ul className="friend-list">
              {data.friends.map(f => {
                const isOnline = onlineUsers.has(f.username);
                return (
                  <li key={f.id || f.username} className="friend-item">
                    <span className="online-dot" style={{ background: isOnline ? '#2a9d4e' : '#ccc' }} />
                    <span className="friend-name">{f.username}{f.username === username ? ' (you)' : ''}</span>
                    <div className="friend-actions">
                      <button className="friend-btn remove" onClick={() => removeFriend(f.username)}>Remove</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Outgoing requests */}
        {data.outgoing.length > 0 && (
          <section className="friend-section">
            <h3 className="friend-section-title">Pending Sent ({data.outgoing.length})</h3>
            <ul className="friend-list">
              {data.outgoing.map(r => (
                <li key={r.id || r.username} className="friend-item">
                  <span className="friend-name">{r.username}</span>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>Request sent</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
