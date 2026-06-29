const { createGame, takeTiles, placeTiles, validatePlacement, endRound, isDraftingOver } = require('./azulEngine');
const { createBot, isBotId, chooseBotMove, BOT_DIFFICULTY_RATING } = require('./botPlayer');
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
      grouped[row.id] = { id: row.id, host: row.host_id, players: [], state: null, gameId: row.game_id || null, hasBot: false };
    }
    grouped[row.id].players.push({ id: row.user_id, userId: row.user_id, username: row.username });
    if (row.state_json && !grouped[row.id].state) {
      try { grouped[row.id].state = JSON.parse(row.state_json); } catch {}
    }
  }

  for (const room of Object.values(grouped)) {
    // room_players never stores bots (they're not real DB users), so the
    // join above silently drops them from room.players too. Restore them
    // from the persisted game state — otherwise a 1-human-1-bot game looks
    // like a 1-player room after a restart, and leaveGame()'s "last player
    // leaving closes the room" check fires incorrectly on the human's very
    // next leave, force-closing an otherwise-live game.
    if (room.state) {
      const bots = room.state.players.filter(p => isBotId(p.userId));
      room.players.push(...bots.map(b => ({ id: b.userId, userId: b.userId, username: b.username, isBot: true, difficulty: b.difficulty })));
      room.hasBot = bots.length > 0;
    }
    rooms.set(room.id, room);
  }

  // If the server restarted mid-game while it was a bot's turn, nothing
  // would ever resume it — the bot only moves reactively inside another
  // player's handleMove call, and it's not their turn. Drive any pending
  // bot turn now so the game doesn't sit frozen until someone notices.
  for (const room of rooms.values()) {
    if (!room.state || !room.hasBot || room.state.gameOver) continue;
    const current = room.state.players[room.state.currentPlayerIndex];
    if (!current || !isBotId(current.userId)) continue;

    autoPlayBots(room);

    if (room.state.gameOver) {
      await finishGame(room);
    } else {
      await pool.query('UPDATE games SET state_json = $1, last_move_at = NOW() WHERE id = $2', [JSON.stringify(room.state), room.gameId]);
    }
  }

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
  rooms.set(id, { id, host: hostUser.id, players: [hostUser], state: null, gameId: null, hasBot: false });
  return { id };
}

async function addBot(roomId, userId, difficulty = 'medium') {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (room.host !== userId) return { error: 'Only host can add a bot' };
  if (room.state) return { error: 'Game already started' };
  if (room.players.length >= 4) return { error: 'Room is full' };
  const botCount = room.players.filter(p => isBotId(p.id)).length;
  if (botCount >= 3) return { error: 'Max 3 bots per room' };
  const bot = createBot(botCount + 1, difficulty);
  room.players.push(bot);
  room.hasBot = true;
  return { room };
}

async function removeBot(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (room.host !== userId) return { error: 'Only host can remove a bot' };
  if (room.state) return { error: 'Game already started' };
  const botIdx = room.players.findLastIndex(p => isBotId(p.id));
  if (botIdx === -1) return { error: 'No bots in room' };
  room.players.splice(botIdx, 1);
  room.hasBot = room.players.some(p => isBotId(p.id));
  return { room };
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
    if (!isBotId(p.id)) {
      await pool.query('INSERT INTO game_players (game_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [gameId, p.id]);
    }
  }

  room.gameId = gameId;
  room.state = state;
  await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['active', roomId]);
  return { state };
}

function applyMove(state, playerIndex, move) {
  const { source, color, patternRow } = move;
  // Validate placement BEFORE mutating factory/center so state stays clean on error
  const preCheck = validatePlacement(state, playerIndex, color, patternRow);
  if (preCheck.error) return preCheck;
  const takeResult = takeTiles(state, playerIndex, source, color);
  if (takeResult.error) return takeResult;
  const placeResult = placeTiles(state, playerIndex, takeResult.taken, patternRow);
  if (placeResult.error) return placeResult;
  if (isDraftingOver(state)) {
    endRound(state);
  } else {
    state.currentPlayerIndex = (playerIndex + 1) % state.players.length;
  }
  return {};
}

// Plays every consecutive bot turn starting from the current player, in
// place on room.state. Shared by handleMove (reactive, after a human's
// move) and restoreRooms (resuming a turn a restart interrupted).
function autoPlayBots(room) {
  if (!room.hasBot) return;
  let safety = 0;
  while (!room.state.gameOver && safety++ < 200) {
    const nextIdx = room.state.currentPlayerIndex;
    const nextPlayer = room.state.players[nextIdx];
    if (!isBotId(nextPlayer.userId)) break;
    const botMove = chooseBotMove(room.state, nextIdx);
    if (!botMove) {
      console.warn(`Bot ${nextPlayer.username} has no legal moves — forcing floor`);
      break;
    }
    const botResult = applyMove(room.state, nextIdx, botMove);
    if (botResult.error) {
      console.warn(`Bot move error: ${botResult.error}`, botMove);
      break;
    }
  }
}

async function handleMove(roomId, userId, move) {
  const room = rooms.get(roomId);
  if (!room || !room.state) return { error: 'No active game' };

  const playerIndex = room.state.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) return { error: 'Not in this game' };

  // Clear last round's summary so it doesn't re-appear on subsequent updates
  room.state.roundSummary = null;

  const result = applyMove(room.state, playerIndex, move);
  if (result.error) return result;

  autoPlayBots(room);

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

  // Fetch current Elo ratings for human players only (bot IDs are strings, not valid integers)
  const humanIds = sorted.map(p => p.userId).filter(id => !isBotId(id));
  const lbRows = humanIds.length
    ? (await pool.query(`SELECT user_id, elo_rating, games_played FROM leaderboard WHERE user_id = ANY($1)`, [humanIds])).rows
    : [];
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
    if (isBotId(player.userId)) continue; // bots have no DB record

    await pool.query('UPDATE game_players SET score = $1, rank = $2 WHERE game_id = $3 AND user_id = $4',
      [player.score, rank + 1, gameId, player.userId]);

    // Skip leaderboard update if any bot was in the game
    if (room.hasBot) continue;

    const isWin = rank === 0 ? 1 : 0;
    const currentElo = lbMap[player.userId]?.elo ?? 1200;
    const newElo = Math.max(100, Math.round(currentElo + (eloDeltas[player.userId] ?? 0)));

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

  // Record bot stats for each human player
  if (room.hasBot) {
    const bots = sorted.filter(p => isBotId(p.userId));
    const humans = sorted.filter(p => !isBotId(p.userId));
    for (const human of humans) {
      const humanRank = sorted.indexOf(human);
      // Win = human placed above ALL bots; loss = any bot placed above human
      const beatenByBot = bots.some(b => sorted.indexOf(b) < humanRank);
      const isWin = !beatenByBot ? 1 : 0;
      for (const bot of bots) {
        await pool.query(`
          INSERT INTO bot_stats (user_id, bot_name, difficulty, wins, losses)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, bot_name, difficulty) DO UPDATE SET
            wins   = bot_stats.wins   + $4,
            losses = bot_stats.losses + $5
        `, [human.userId, bot.username, bot.difficulty || 'medium', isWin, 1 - isWin]);
      }

      // Global bot-record Elo — solo games only (exactly one human at the
      // table). Each bot is treated as a fixed-rating "opponent" (rated by
      // difficulty), and the human's rating moves via the same pairwise Elo
      // formula used for PvP, so beating harder bots earns more rating.
      if (humans.length === 1) {
        const { rows: blRows } = await pool.query(
          'SELECT elo_rating, games_played FROM bot_leaderboard WHERE user_id = $1',
          [human.userId]
        );
        const currentElo = blRows[0]?.elo_rating ?? 1200;
        const gamesPlayed = blRows[0]?.games_played ?? 0;
        const K = kFactor(gamesPlayed);

        let delta = 0;
        for (const bot of bots) {
          const botRank = sorted.indexOf(bot);
          const wonVsBot = humanRank < botRank ? 1 : 0;
          const botRating = BOT_DIFFICULTY_RATING[bot.difficulty] ?? 1000;
          const E = 1 / (1 + Math.pow(10, (botRating - currentElo) / 400));
          delta += K * (wonVsBot - E);
        }
        const newElo = Math.max(100, Math.round(currentElo + delta));

        await pool.query(`
          INSERT INTO bot_leaderboard (user_id, wins, losses, games_played, elo_rating)
          VALUES ($1, $2, $3, 1, $4)
          ON CONFLICT (user_id) DO UPDATE SET
            wins = bot_leaderboard.wins + $2,
            losses = bot_leaderboard.losses + $3,
            games_played = bot_leaderboard.games_played + 1,
            elo_rating = $4
        `, [human.userId, isWin, 1 - isWin, newElo]);
      }
    }
  }

  room.state = null;
  room.gameId = null;
}

async function leaveGame(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return { action: 'none' };

  // Deduct 5 points from the leaver if a ranked game (no bots) was in progress
  const wasActiveGame = !!room.state && !room.hasBot && !isBotId(userId);
  if (wasActiveGame) {
    await pool.query(`
      UPDATE leaderboard
      SET elo_rating = GREATEST(100, elo_rating - 5)
      WHERE user_id = $1
    `, [userId]);
  }

  room.players = room.players.filter(p => p.id !== userId);
  room.state = null;
  await pool.query('DELETE FROM room_players WHERE room_id = $1 AND user_id = $2', [roomId, userId]);

  if (room.players.length <= 1) {
    rooms.delete(roomId);
    await pool.query('DELETE FROM room_players WHERE room_id = $1', [roomId]);
    await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['closed', roomId]);
    return { action: 'close' };
  }

  if (room.host === userId) {
    // host_id is an INTEGER FK to users — never hand the host seat to a bot
    const nextHost = room.players.find(p => !isBotId(p.id));
    if (!nextHost) {
      // No human left in the room — bots can't host, so close it
      rooms.delete(roomId);
      await pool.query('DELETE FROM room_players WHERE room_id = $1', [roomId]);
      await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['closed', roomId]);
      return { action: 'close' };
    }
    room.host = nextHost.id;
  }
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

module.exports = { createRoom, addBot, removeBot, joinRoom, startGame, handleMove, leaveGame, closeRoom, getRoom, getUserRooms, restoreRooms, closeStaleGames };
