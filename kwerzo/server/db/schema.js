'use strict';

const DEV_MODE = !process.env.DATABASE_URL;

let pool = null;

if (!DEV_MODE) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// In-memory store used when DATABASE_URL is not set
const memDb = {
  users: [],       // { id, username, email, password_hash }
  leaderboard: []  // { user_id, wins, losses, games_played, total_score, elo_rating }
};
let memNextId = 1;

async function initDb() {
  if (DEV_MODE) {
    console.log('[kwerzo] No DATABASE_URL — running with in-memory storage (data resets on restart)');
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kwerzo_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(32) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS kwerzo_leaderboard (
      user_id INTEGER PRIMARY KEY REFERENCES kwerzo_users(id) ON DELETE CASCADE,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      elo_rating INTEGER DEFAULT 1000
    );
  `);
  console.log('[kwerzo] DB initialized');
}

module.exports = { pool, initDb, DEV_MODE, memDb, memNextId: () => memNextId++ };
