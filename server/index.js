require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const { init } = require('./db/schema');
const authRoutes = require('./routes/auth');
const leaderboardRoutes = require('./routes/leaderboard');
const { createRoom, joinRoom, startGame, handleMove, leaveGame, closeRoom, getRoom, getUserRooms, restoreRooms, closeStaleGames } = require('./game/roomManager');

const path = require('path');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

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

// Track online users: userId -> username
const onlineUsers = new Map();

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

io.on('connection', async socket => {
  const user = socket.user;

  // Track online presence
  onlineUsers.set(user.username, user.id);
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
      players: room.players.map(p => p.username),
      hostUsername: room.players.find(p => p.id === room.host)?.username,
    });
  });

  socket.on('start_game', async ({ roomId }) => {
    const result = await startGame(roomId, user.id);
    if (result.error) return socket.emit('game_error', result.error);
    io.to(roomId).emit('game_started', { roomId, state: result.state });
  });

  socket.on('close_room', async ({ roomId }) => {
    const result = await closeRoom(roomId, user.id);
    if (result.error) return socket.emit('game_error', result.error);
    io.to(roomId).emit('room_closed');
  });

  socket.on('leave_game', async ({ roomId }) => {
    const result = await leaveGame(roomId, user.id);
    if (result.action === 'close') {
      io.to(roomId).emit('room_closed');
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
      io.to(roomId).emit('game_over', { roomId, players: result.state.players });
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(user.username);
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
