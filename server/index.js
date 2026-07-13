require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const { init } = require('./db/schema');
const authRoutes = require('./routes/auth');
const leaderboardRoutes = require('./routes/leaderboard');
const botStatsRoutes = require('./routes/botStats');
const botLeaderboardRoutes = require('./routes/botLeaderboard');
const { createRoom, addBot, removeBot, joinRoom, startGame, handleMove, leaveGame, closeRoom, getRoom, getUserRooms, restoreRooms, closeStaleGames } = require('./game/roomManager');
const { sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend, getFriendData, createGameInvite, respondGameInvite, getPendingGameInvites } = require('./friends/friendsManager');
const { createNotification, getUnreadCount } = require('./notifications/notificationsManager');
const notificationsRoutes = require('./routes/notifications');

const path = require('path');

// A single bad DB query or unexpected error in a socket handler used to
// crash the entire process (Node terminates on unhandled rejections by
// default), taking the whole site down for every player. Log instead of
// dying — the request that triggered it will simply fail.
process.on('unhandledRejection', err => {
  console.error('Unhandled rejection (process kept alive):', err);
});

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/ads.txt', (req, res) => {
  res.type('text/plain').send('google.com, pub-3107493448711439, DIRECT, f08c47fec0942fa0\n');
});
app.get('/sitemap.xml', (req, res) => {
  const base = 'https://www.iberzo.com';
  const urls = [
    { loc: base, priority: '1.0', changefreq: 'weekly' },
    { loc: `${base}/how-to-play`, priority: '0.9', changefreq: 'monthly' },
    { loc: `${base}/about`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${base}/privacy`, priority: '0.4', changefreq: 'yearly' },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/bot-stats', botStatsRoutes);
app.use('/api/bot-leaderboard', botLeaderboardRoutes);
app.use('/api/notifications', notificationsRoutes);

// Helper DB lookups
const { pool: _pool } = require('./db/schema');
async function getUserIdByUsername(username) {
  const { rows } = await _pool.query('SELECT id FROM users WHERE username = $1', [username]);
  return rows[0]?.id ?? null;
}
async function getUsernameById(id) {
  const { rows } = await _pool.query('SELECT username FROM users WHERE id = $1', [id]);
  return rows[0]?.username ?? null;
}

app.get('/api/friends', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    res.json(await getFriendData(user.id));
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/my-rooms', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    res.json(await getUserRooms(user.id));
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });

// Redis adapter (enabled when REDIS_URL is set, e.g. on Railway)
if (process.env.REDIS_URL) {
  const { createAdapter } = require('@socket.io/redis-adapter');
  const { createClient } = require('ioredis');
  const pub = createClient(process.env.REDIS_URL);
  const sub = pub.duplicate();
  Promise.all([pub.connect?.() ?? Promise.resolve(), sub.connect?.() ?? Promise.resolve()])
    .then(() => { io.adapter(createAdapter(pub, sub)); console.log('Redis adapter connected'); })
    .catch(e => console.warn('Redis adapter failed, using in-memory:', e.message));
}

function authSocket(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}

io.use(authSocket);

// Track online users: username -> userId
const onlineUsers = new Map();
// Track sockets: username -> socket
const userSockets = new Map();

// Search users endpoint
app.get('/api/users/search', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const { pool } = require('./db/schema');
    const { rows } = await pool.query(
      `SELECT username FROM users WHERE username ILIKE $1 LIMIT 20`,
      [`%${q}%`]
    );
    res.json(rows.map(r => ({ username: r.username, online: onlineUsers.has(r.username) })));
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Push a notification to a user and emit live update if they're online
async function pushNotification(userId, username, type, subject, body, data) {
  const result = await createNotification(userId, type, subject, body, data);
  const targetSocket = userSockets.get(username);
  if (targetSocket) {
    const count = await getUnreadCount(userId);
    targetSocket.emit('notification_pushed', { id: result.id, type, subject, body, data, read: false, created_at: new Date().toISOString(), count });
  }
}

io.on('connection', async socket => {
  const user = socket.user;

  // Track online presence
  onlineUsers.set(user.username, user.id);
  userSockets.set(user.username, socket);
  io.emit('online_users', Array.from(onlineUsers.keys()));

  // Re-join all active rooms on reconnect
  const rooms = await getUserRooms(user.id);
  rooms.forEach(r => socket.join(r.roomId));

  socket.on('create_room', async () => {
    const result = await createRoom({ id: user.id, userId: user.id, username: user.username });
    if (result.error) return socket.emit('game_error', result.error);
    socket.join(result.id);
    socket.emit('room_created', { roomId: result.id });
  });

  socket.on('join_room', async ({ roomId }) => {
    const result = await joinRoom(roomId, { id: user.id, userId: user.id, username: user.username });
    if (result.error) return socket.emit('game_error', result.error);
    socket.join(roomId);
    const room = getRoom(roomId);
    io.to(roomId).emit('room_update', {
      roomId,
      players: room.players.map(p => ({ username: p.username, isBot: !!p.isBot, difficulty: p.difficulty || null })),
      hostUsername: room.players.find(p => p.id === room.host)?.username,
    });
  });

  socket.on('start_game', async ({ roomId }) => {
    const result = await startGame(roomId, user.id);
    if (result.error) return socket.emit('game_error', result.error);
    io.to(roomId).emit('game_started', { roomId, state: result.state });
  });

  socket.on('add_bot', async ({ roomId, difficulty }) => {
    const result = await addBot(roomId, user.id, difficulty);
    if (result.error) return socket.emit('game_error', result.error);
    const room = getRoom(roomId);
    io.to(roomId).emit('room_update', {
      roomId,
      players: room.players.map(p => ({ username: p.username, isBot: !!p.isBot, difficulty: p.difficulty || null })),
      hostUsername: room.players.find(p => p.id === room.host)?.username,
    });
  });

  socket.on('remove_bot', async ({ roomId }) => {
    const result = await removeBot(roomId, user.id);
    if (result.error) return socket.emit('game_error', result.error);
    const room = getRoom(roomId);
    io.to(roomId).emit('room_update', {
      roomId,
      players: room.players.map(p => ({ username: p.username, isBot: !!p.isBot, difficulty: p.difficulty || null })),
      hostUsername: room.players.find(p => p.id === room.host)?.username,
    });
  });

  socket.on('close_room', async ({ roomId }) => {
    const result = await closeRoom(roomId, user.id);
    if (result.error) return socket.emit('game_error', result.error);
    io.to(roomId).emit('room_closed', { roomId });
  });

  socket.on('leave_game', async ({ roomId }) => {
    let result;
    try {
      result = await leaveGame(roomId, user.id);
    } catch (err) {
      console.error('leave_game failed:', err);
      return socket.emit('game_error', 'Failed to leave game');
    }
    if (result.action === 'close') {
      io.to(roomId).emit('room_closed', { roomId });
    } else if (result.action === 'reset') {
      socket.leave(roomId);
      io.to(roomId).emit('game_abandoned', { roomId, username: user.username });
      io.to(roomId).emit('room_update', { players: result.players, hostUsername: result.hostUsername });
    }
  });

  socket.on('make_move', async ({ roomId, move }) => {
    const result = await handleMove(roomId, user.id, move);
    if (result.error) return socket.emit('game_error', result.error);
    io.to(roomId).emit('game_update', { roomId, state: result.state });
    if (result.gameOver) {
      io.to(roomId).emit('game_over', {
        roomId,
        players: result.state.players,
        roundSummary: result.state.roundSummary,
        finalSummary: result.state.finalSummary,
      });
      io.to(roomId).emit('room_closed', { roomId });
    }
  });

  socket.on('request_online_users', () => {
    socket.emit('online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('send_invite', ({ toUsername }) => {
    const targetSocket = userSockets.get(toUsername);
    if (!targetSocket) return socket.emit('game_error', 'Player is no longer online');
    targetSocket.emit('invite_received', { fromUsername: user.username });
  });

  socket.on('accept_invite', async ({ fromUsername }) => {
    const fromSocket = userSockets.get(fromUsername);
    const result = await createRoom({ id: user.id, userId: user.id, username: user.username });
    if (result.error) return socket.emit('game_error', result.error);
    const roomId = result.id;
    socket.join(roomId);

    // Join the inviter
    const fromUserId = onlineUsers.get(fromUsername);
    if (fromUserId) {
      const joinResult = await joinRoom(roomId, { id: fromUserId, userId: fromUserId, username: fromUsername });
      if (!joinResult.error && fromSocket) fromSocket.join(roomId);
    }

    const room = getRoom(roomId);
    io.to(roomId).emit('invite_accepted', {
      roomId,
      players: room.players.map(p => ({ username: p.username, isBot: !!p.isBot, difficulty: p.difficulty || null })),
      hostUsername: user.username,
    });
  });

  socket.on('reject_invite', ({ fromUsername }) => {
    const fromSocket = userSockets.get(fromUsername);
    if (fromSocket) fromSocket.emit('invite_rejected', { byUsername: user.username });
  });

  // --- Friends & game invites ---

  // Deliver unread notification count on connect
  getUnreadCount(user.id).then(count => {
    socket.emit('notification_count', { count });
  }).catch(() => {});

  // Deliver pending game invites on connect
  getPendingGameInvites(user.id).then(pending => {
    if (pending.length) socket.emit('pending_game_invites', pending);
  }).catch(() => {});

  socket.on('send_friend_request', async ({ toUsername }) => {
    const result = await sendFriendRequest(user.id, toUsername);
    if (result.error) return socket.emit('friend_error', result.error);
    socket.emit('friend_request_sent', { toUsername });
    const toId = onlineUsers.get(toUsername) || await getUserIdByUsername(toUsername);
    if (toId) await pushNotification(toId, toUsername, 'friend_request',
      `Friend request from ${user.username}`,
      `${user.username} wants to be your friend.`,
      { fromUsername: user.username, fromId: user.id }
    );
  });

  socket.on('accept_friend_request', async ({ fromUsername }) => {
    const fromId = onlineUsers.get(fromUsername) || await getUserIdByUsername(fromUsername);
    if (!fromId) return socket.emit('friend_error', 'User not found');
    const result = await acceptFriendRequest(user.id, fromId);
    if (result.error) return socket.emit('friend_error', result.error);
    socket.emit('friends_updated');
    const fromSocket = userSockets.get(fromUsername);
    if (fromSocket) fromSocket.emit('friends_updated');
    await pushNotification(fromId, fromUsername, 'system',
      `${user.username} accepted your friend request`,
      `You and ${user.username} are now friends.`, null
    );
  });

  socket.on('decline_friend_request', async ({ fromUsername }) => {
    const fromId = onlineUsers.get(fromUsername) || await getUserIdByUsername(fromUsername);
    if (!fromId) return;
    await declineFriendRequest(user.id, fromId);
    socket.emit('friends_updated');
  });

  socket.on('remove_friend', async ({ friendUsername }) => {
    const friendId = onlineUsers.get(friendUsername) || await getUserIdByUsername(friendUsername);
    if (!friendId) return;
    await removeFriend(user.id, friendId);
    socket.emit('friends_updated');
    const friendSocket = userSockets.get(friendUsername);
    if (friendSocket) friendSocket.emit('friends_updated');
  });

  socket.on('send_game_invite_friend', async ({ toUsername, roomId }) => {
    const toId = onlineUsers.get(toUsername) || await getUserIdByUsername(toUsername);
    if (!toId) return socket.emit('friend_error', 'User not found');
    const result = await createGameInvite(user.id, toId, roomId);
    if (result.error) return socket.emit('friend_error', result.error);
    const targetSocket = userSockets.get(toUsername);
    await pushNotification(toId, toUsername, 'game_invite',
      `Game invite from ${user.username}`,
      `${user.username} invited you to play a game.`,
      { fromUsername: user.username, roomId, inviteId: result.inviteId }
    );
    if (targetSocket) {
      targetSocket.emit('game_invite_received', { fromUsername: user.username, roomId, inviteId: result.inviteId });
      socket.emit('game_invite_delivered', { toUsername, online: true });
    } else {
      socket.emit('game_invite_delivered', { toUsername, online: false });
    }
  });

  socket.on('respond_game_invite', async ({ inviteId, accept }) => {
    const result = await respondGameInvite(inviteId, user.id, accept);
    if (result.error) return socket.emit('friend_error', result.error);
    if (accept && result.roomId) {
      const joinResult = await joinRoom(result.roomId, { id: user.id, userId: user.id, username: user.username });
      if (!joinResult.error) {
        socket.join(result.roomId);
        const room = getRoom(result.roomId);
        if (room) {
          io.to(result.roomId).emit('room_update', {
            roomId: result.roomId,
            players: room.players.map(p => ({ username: p.username, isBot: !!p.isBot, difficulty: p.difficulty || null })),
            hostUsername: room.players.find(p => p.id === room.host)?.username,
          });
        }
        socket.emit('game_invite_joined', { roomId: result.roomId });
      } else {
        socket.emit('friend_error', 'Could not join room — it may have started or closed');
      }
      const fromUsername = await getUsernameById(result.fromUserId);
      const fromSocket = fromUsername && userSockets.get(fromUsername);
      if (fromSocket) fromSocket.emit('friends_updated');
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(user.username);
    userSockets.delete(user.username);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

async function runStaleCleanup() {
  const closedRoomIds = await closeStaleGames();
  closedRoomIds.forEach(roomId => {
    io.to(roomId).emit('game_abandoned', { roomId, username: 'system' });
  });
}

const PORT = process.env.PORT || 3001;

// Serve built client in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('{*path}', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await init();
    await restoreRooms();
    runStaleCleanup();
    setInterval(runStaleCleanup, 60 * 60 * 1000);
    console.log('DB ready');
  } catch (err) {
    console.error('DB init failed:', err);
    process.exit(1);
  }
});
