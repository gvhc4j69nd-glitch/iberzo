// One-time (re-runnable) backfill: replays every finished solo bot game
// (exactly 1 human + bots) in chronological order and rebuilds the
// bot_leaderboard table from scratch, using the same pairwise Elo formula
// as the live game-finish path in game/roomManager.js.
//
// Usage:  node server/scripts/rebuildBotLeaderboard.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../db/schema');
const { isBotId, BOT_DIFFICULTY_RATING } = require('../game/botPlayer');

function kFactor(gamesPlayed) {
  if (gamesPlayed < 10) return 40;
  if (gamesPlayed <= 30) return 24;
  return 16;
}

async function main() {
  const { rows: games } = await pool.query(`
    SELECT id, state_json
    FROM games
    WHERE status = 'finished' AND state_json IS NOT NULL
    ORDER BY COALESCE(finished_at, created_at) ASC, id ASC
  `);

  const acc = {}; // userId -> { wins, losses, gamesPlayed, elo }
  let soloGames = 0;

  for (const row of games) {
    let state;
    try { state = JSON.parse(row.state_json); } catch { continue; }
    if (!Array.isArray(state?.players)) continue;

    const bots = state.players.filter(p => isBotId(p.userId));
    const humans = state.players.filter(p => !isBotId(p.userId));
    if (bots.length === 0 || humans.length !== 1) continue;

    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    const human = humans[0];
    const humanRank = sorted.indexOf(human);
    const beatenByBot = bots.some(b => sorted.indexOf(b) < humanRank);
    const isWin = beatenByBot ? 0 : 1;

    if (!acc[human.userId]) acc[human.userId] = { wins: 0, losses: 0, gamesPlayed: 0, elo: 1200 };
    const a = acc[human.userId];
    const K = kFactor(a.gamesPlayed);

    let delta = 0;
    for (const bot of bots) {
      const botRank = sorted.indexOf(bot);
      const wonVsBot = humanRank < botRank ? 1 : 0;
      const botRating = BOT_DIFFICULTY_RATING[bot.difficulty] ?? 1000;
      const E = 1 / (1 + Math.pow(10, (botRating - a.elo) / 400));
      delta += K * (wonVsBot - E);
    }

    a.wins += isWin;
    a.losses += 1 - isWin;
    a.gamesPlayed += 1;
    a.elo = Math.max(100, Math.round(a.elo + delta));
    soloGames++;
  }

  console.log(`Scanned ${games.length} finished games — ${soloGames} were solo bot games, affecting ${Object.keys(acc).length} player(s).`);

  await pool.query('BEGIN');
  try {
    await pool.query('DELETE FROM bot_leaderboard');
    for (const [userId, a] of Object.entries(acc)) {
      await pool.query(
        `INSERT INTO bot_leaderboard (user_id, wins, losses, games_played, elo_rating)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, a.wins, a.losses, a.gamesPlayed, a.elo]
      );
      console.log(`  user ${userId}: ${a.wins}W-${a.losses}L, ${a.gamesPlayed} games, Elo ${a.elo}`);
    }
    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }

  console.log('bot_leaderboard rebuilt.');
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
