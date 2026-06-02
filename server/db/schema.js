const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      host_id INTEGER REFERENCES users(id),
      status TEXT DEFAULT 'waiting',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS room_players (
      room_id TEXT REFERENCES rooms(id),
      user_id INTEGER REFERENCES users(id),
      PRIMARY KEY (room_id, user_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      room_id TEXT REFERENCES rooms(id),
      status TEXT DEFAULT 'active',
      state_json TEXT,
      last_move_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_players (
      game_id INTEGER REFERENCES games(id),
      user_id INTEGER REFERENCES users(id),
      score INTEGER DEFAULT 0,
      rank INTEGER,
      PRIMARY KEY (game_id, user_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      elo_rating INTEGER DEFAULT 1200
    )
  `);
  // Migration: add elo_rating to existing tables
  await pool.query(`ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1200`);
  // Bot stats tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_stats (
      user_id    INTEGER REFERENCES users(id),
      bot_name   TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      wins       INTEGER DEFAULT 0,
      losses     INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, bot_name, difficulty)
    )
  `);
  // Fix bot_stats rows that were recorded as 'medium' for hard-difficulty bots
  // (bug: difficulty was dropped from game state players before being written)
  const HARD_BOT_NAMES = ['Bot Goya', 'Bot Sorolla', 'Bot Anglada', 'Bot Casas'];
  const DEMANDING_BOT_NAMES = ['Bot Michelangelo', 'Bot Da Vinci', 'Bot Machiavelli', 'Bot Raphael'];
  for (const name of HARD_BOT_NAMES) {
    await pool.query(`
      UPDATE bot_stats SET difficulty = 'hard'
      WHERE bot_name = $1 AND difficulty = 'medium'
    `, [name]);
  }
  for (const name of DEMANDING_BOT_NAMES) {
    await pool.query(`
      UPDATE bot_stats SET difficulty = 'demanding'
      WHERE bot_name = $1 AND difficulty = 'medium'
    `, [name]);
  }

  // Friendships
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friendships (
      id           SERIAL PRIMARY KEY,
      requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      addressee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (requester_id, addressee_id)
    )
  `);

  // Game invites (for offline delivery)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_invites (
      id           SERIAL PRIMARY KEY,
      from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      to_user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
      room_id      TEXT,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

module.exports = { pool, init };
