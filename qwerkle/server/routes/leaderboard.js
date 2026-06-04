'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/schema');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'qwerkle-dev-secret';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.username, l.wins, l.losses, l.games_played, l.total_score, l.elo_rating,
             RANK() OVER (ORDER BY l.elo_rating DESC) AS rank
      FROM qwerkle_leaderboard l
      JOIN qwerkle_users u ON u.id = l.user_id
      WHERE l.games_played > 0
      ORDER BY l.elo_rating DESC
      LIMIT 50
    `);
    const myRow = await pool.query(`
      SELECT l.wins, l.losses, l.games_played, l.total_score, l.elo_rating,
             RANK() OVER (ORDER BY l.elo_rating DESC) AS rank
      FROM qwerkle_leaderboard l
      WHERE l.user_id = $1
    `, [req.user.userId]);
    res.json({ top: result.rows, me: myRow.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function updateStats(winnerIds, allPlayerIds, scores) {
  for (const userId of allPlayerIds) {
    const isWinner = winnerIds.includes(userId);
    const score = scores[userId] || 0;
    await pool.query(`
      INSERT INTO qwerkle_leaderboard (user_id, wins, losses, games_played, total_score)
      VALUES ($1, $2, $3, 1, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        wins = qwerkle_leaderboard.wins + $2,
        losses = qwerkle_leaderboard.losses + $3,
        games_played = qwerkle_leaderboard.games_played + 1,
        total_score = qwerkle_leaderboard.total_score + $4
    `, [userId, isWinner ? 1 : 0, isWinner ? 0 : 1, score]);
  }
}

module.exports = { router, updateStats };
