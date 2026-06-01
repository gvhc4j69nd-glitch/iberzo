const { createGame, takeTiles, placeTiles, endRound, isDraftingOver } = require('./azulEngine');
const { pool } = require('../db/schema');

const rooms = new Map();

async function restoreRooms() {
  const { rows } = await pool.query(`
    SELECT r.id, r.host_id, r.status,
           u.id as user_id, u.username,
           g.id as game_id, g.state_json
    FROM rooms r
    JOIN room_players rp ON rp.room_id = r.id
    JOIN users u ON u.id = rp.user_id
    LEFT JOIN games g ON g.room_id = r.id AND g.status = 'active'
    WHERE r.status IN ('waiting', 'active')
    ORDER BY r.id
  `);

  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.id]) {
      grouped[row.id] = { id: row.id, host: row.host_id, players: [], state: null, gameId: row.game_id || null };
    }
    grouped[row.id].players.push({ id: row.user_id, userId: row.user_id, username: row.username });
    if (row.state_json && !grouped[row.id].state) {
      try { grouped[row.id].state = JSON.parse(row.state_json); } catch {}
    }
  }

  for (const room of Object.values(grouped)) rooms.set(room.id, room);
  console.log(`Restored ${rooms.size} rooms from DB`);
}

function getUserRoomCount(userId) {
  let count = 0;
  for (const room of rooms.values()) {
    if (room.players.find(p => p.id === userId)) count++;
  }
  return count;
}

async function createRoom(hostUser) {
  if (getUserRoomCount(hostUser.id) >= 3) return { error: 'You already have 3 open games (maximum)' };
  const id = Math.random().toString(36).slice(2, 8).toUpperCase();
  await pool.query('INSERT INTO rooms (id, host_id, status) VALUES ($1, $2, $3)', [id, hostUser.id, 'waiting']);
  await pool.query('INSERT INTO room_players (room_id, user_id) VALUES ($1, $2)', [id, hostUser.id]);
  rooms.set(id, { id, host: hostUser.id, players: [hostUser], state: null, gameId: null });
  return { id };
}

async function joinRoom(roomId, user) {
  if (getUserRoomCount(user.id) >= 3) return { error: 'You already have 3 open games (maximum)' };
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (room.state) return { error: 'Game already started' };
  if (room.players.length >= 4) return { error: 'Room full' };
  if (room.players.find(p => p.id === user.id)) return { error: 'Already in room' };
  room.players.push(user);
  await pool.query('INSERT INTO room_players (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [roomId, user.id]);
  return { room };
}

async function startGame(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (room.host !== userId) return { error: 'Only host can start' };
  if (room.players.length < 2) return { error: 'Need at least 2 players' };

  const state = createGame(room.players);
  const { rows } = await pool.query(
    'INSERT INTO games (room_id, status, state_json) VALUES ($1, $2, $3) RETURNING id',
    [roomId, 'active', JSON.stringify(state)]
  );
  const gameId = rows[0].id;

  for (const p of room.players) {
    await pool.query('INSERT INTO game_players (game_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [gameId, p.id]);
  }

  room.gameId = gameId;
  room.state = state;
  await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['active', roomId]);
  return { state };
}

async function handleMove(roomId, userId, move) {
  const room = rooms.get(roomId);
  if (!room || !room.state) return { error: 'No active game' };

  const playerIndex = room.state.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) return { error: 'Not in this game' };

  const { source, color, patternRow } = move;
  const takeResult = takeTiles(room.state, playerIndex, source, color);
  if (takeResult.error) return takeResult;

  const placeResult = placeTiles(room.state, playerIndex, takeResult.taken, patternRow);
  if (placeResult.error) return placeResult;

  if (isDraftingOver(room.state)) {
    endRound(room.state);
  } else {
    room.state.currentPlayerIndex = (playerIndex + 1) % room.state.players.length;
  }

  const isOver = room.state.gameOver;
  const finalState = isOver ? { ...room.state } : room.state;

  if (isOver) {
    await finishGame(room);
  } else {
    await pool.query('UPDATE games SET state_json = $1, last_move_at = NOW() WHERE id = $2', [JSON.stringify(room.state), room.gameId]);
  }

  return { state: finalState, gameOver: isOver };
}

function kFactor(gamesPlayed) {
  if (gamesPlayed < 10) return 40;
  if (gamesPlayed <= 30) return 24;
  return 16;
}

async function finishGame(room) {
  const { state, gameId } = room;
  const sorted = [...state.players].sort((a, b) => b.score - a.score);

  await pool.query('UPDATE games SET status = $1, state_json = $2, finished_at = NOW() WHERE id = $3',
    ['finished', JSON.stringify(state), gameId]);
  await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['waiting', room.id]);

  // Fetch current Elo ratings for all players
  const userIds = sorted.map(p => p.userId);
  const { rows: lbRows } = await pool.query(
    `SELECT user_id, elo_rating, games_played FROM leaderboard WHERE user_id = ANY($1)`,
    [userIds]
  );
  const lbMap = {};
  lbRows.forEach(r => { lbMap[r.user_id] = { elo: r.elo_rating, gamesPlayed: parseInt(r.games_played) }; });
  // Default for new players
  sorted.forEach(p => {
    if (!lbMap[p.userId]) lbMap[p.userId] = { elo: 1200, gamesPlayed: 0 };
  });

  // Compute Elo deltas via pairwise comparison
  const eloDeltas = {};
  sorted.forEach(p => { eloDeltas[p.userId] = 0; });

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const winner = sorted[i]; // higher rank (lower index) = winner
      const loser = sorted[j];
      const Ra = lbMap[winner.userId].elo;
      const Rb = lbMap[loser.userId].elo;
      const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
      const Eb = 1 - Ea;
      const Ka = kFactor(lbMap[winner.userId].gamesPlayed);
      const Kb = kFactor(lbMap[loser.userId].gamesPlayed);
      eloDeltas[winner.userId] += Ka * (1 - Ea);
      eloDeltas[loser.userId] += Kb * (0 - Eb);
    }
  }

  for (let rank = 0; rank < sorted.length; rank++) {
    const player = sorted[rank];
    await pool.query('UPDATE game_players SET score = $1, rank = $2 WHERE game_id = $3 AND user_id = $4',
      [player.score, rank + 1, gameId, player.userId]);

    const isWin = rank === 0 ? 1 : 0;
    const currentElo = lbMap[player.userId].elo;
    const newElo = Math.max(100, Math.round(currentElo + eloDeltas[player.userId]));

    await pool.query(`
      INSERT INTO leaderboard (user_id, wins, losses, total_score, games_played, elo_rating)
      VALUES ($1, $2, $3, $4, 1, $5)
      ON CONFLICT (user_id) DO UPDATE SET
        wins = leaderboard.wins + $2,
        losses = leaderboard.losses + $3,
        total_score = leaderboard.total_score + $4,
        games_played = leaderboard.games_played + 1,
        elo_rating = $5
    `, [player.userId, isWin, 1 - isWin, player.score, newElo]);
  }

  room.state = null;
  room.gameId = null;
}

async function leaveGame(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return { action: 'none' };

  room.players = room.players.filter(p => p.id !== userId);
  room.state = null;
  await pool.query('DELETE FROM room_players WHERE room_id = $1 AND user_id = $2', [roomId, userId]);

  if (room.players.length <= 1) {
    rooms.delete(roomId);
    await pool.query('DELETE FROM room_players WHERE room_id = $1', [roomId]);
    await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['closed', roomId]);
    return { action: 'close' };
  }

  if (room.host === userId) room.host = room.players[0].id;
  await pool.query('UPDATE rooms SET host_id = $1, status = $2 WHERE id = $3', [room.host, 'waiting', roomId]);

  return {
    action: 'reset',
    hostUsername: room.players.find(p => p.id === room.host)?.username,
    players: room.players.map(p => p.username),
  };
}

async function closeRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (room.host !== userId) return { error: 'Only host can close room' };
  rooms.delete(roomId);
  await pool.query('DELETE FROM room_players WHERE room_id = $1', [roomId]);
  await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['closed', roomId]);
  return {};
}

function getRoom(roomId) { return rooms.get(roomId); }

async function getUserRooms(userId) {
  const { rows } = await pool.query(`
    SELECT r.id as room_id, r.host_id, r.status as room_status,
           u2.username as host_username,
           g.state_json, g.id as game_id
    FROM room_players rp
    JOIN rooms r ON r.id = rp.room_id
    JOIN users u2 ON u2.id = r.host_id
    LEFT JOIN games g ON g.room_id = r.id AND g.status = 'active'
    WHERE rp.user_id = $1 AND r.status IN ('waiting', 'active')
  `, [userId]);

  const result = [];
  for (const row of rows) {
    const { rows: playerRows } = await pool.query(`
      SELECT u.username FROM room_players rp2
      JOIN users u ON u.id = rp2.user_id
      WHERE rp2.room_id = $1
    `, [row.room_id]);

    result.push({
      roomId: row.room_id,
      hostUsername: row.host_username,
      isHost: row.host_id === userId,
      roomStatus: row.room_status,
      players: playerRows.map(r => r.username),
      state: row.state_json ? JSON.parse(row.state_json) : null,
      gameId: row.game_id,
    });
  }
  return result;
}

async function closeStaleGames() {
  const { rows: stale } = await pool.query(`
    SELECT g.id as game_id, g.room_id
    FROM games g
    WHERE g.status = 'active'
      AND (
        (g.last_move_at IS NOT NULL AND g.last_move_at < NOW() - INTERVAL '72 hours')
        OR (g.last_move_at IS NULL AND g.created_at < NOW() - INTERVAL '72 hours')
      )
  `);

  for (const { game_id, room_id } of stale) {
    await pool.query(`UPDATE games SET status = 'abandoned', finished_at = NOW() WHERE id = $1`, [game_id]);
    await pool.query(`UPDATE rooms SET status = 'closed' WHERE id = $1`, [room_id]);
    await pool.query(`DELETE FROM room_players WHERE room_id = $1`, [room_id]);
    rooms.delete(room_id);
  }

  if (stale.length > 0) console.log(`Closed ${stale.length} stale game(s)`);
  return stale.map(r => r.room_id);
}

module.exports = { createRoom, joinRoom, startGame, handleMove, leaveGame, closeRoom, getRoom, getUserRooms, restoreRooms, closeStaleGames };
