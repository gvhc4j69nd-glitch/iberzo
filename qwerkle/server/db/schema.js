'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS qwerkle_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(32) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS qwerkle_leaderboard (
      user_id INTEGER PRIMARY KEY REFERENCES qwerkle_users(id) ON DELETE CASCADE,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      elo_rating INTEGER DEFAULT 1000
    );
  `);
  console.log('[qwerkle] DB initialized');
}

module.exports = { pool, initDb };
