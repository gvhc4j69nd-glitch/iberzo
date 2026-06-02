const express = require('express');
const { pool } = require('../db/schema');

const router = express.Router();

router.get('/', async (req, res) => {
  const { username } = req.query;

  // Top 50
  const { rows } = await pool.query(`
    SELECT u.username, l.wins, l.losses, l.games_played, l.total_score, l.elo_rating
    FROM leaderboard l
    JOIN users u ON u.id = l.user_id
    ORDER BY l.elo_rating DESC, l.wins DESC
    LIMIT 50
  `);

  // Caller's rank (may be outside top 50)
  let myRank = null;
  if (username) {
    const rankResult = await pool.query(`
      SELECT rank, wins, losses, total_score, elo_rating FROM (
        SELECT u.username, l.wins, l.losses, l.total_score, l.elo_rating,
               RANK() OVER (ORDER BY l.elo_rating DESC, l.wins DESC) AS rank
        FROM leaderboard l
        JOIN users u ON u.id = l.user_id
      ) ranked
      WHERE username = $1
    `, [username]);
    if (rankResult.rows.length) myRank = rankResult.rows[0];
  }

  res.json({ rows, myRank });
});

module.exports = router;
