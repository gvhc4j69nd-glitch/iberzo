const express = require('express');
const { pool } = require('../db/schema');

const router = express.Router();

router.get('/', async (req, res) => {
  const { username } = req.query;

  // Top 50, ranked by bot-record Elo
  const { rows } = await pool.query(`
    SELECT u.username, bl.wins, bl.losses, bl.elo_rating
    FROM bot_leaderboard bl
    JOIN users u ON u.id = bl.user_id
    ORDER BY bl.elo_rating DESC, bl.wins DESC
    LIMIT 50
  `);

  // Caller's rank (may be outside top 50)
  let myRank = null;
  if (username) {
    const rankResult = await pool.query(`
      SELECT rank, wins, losses, elo_rating, games_played FROM (
        SELECT u.username, bl.wins, bl.losses, bl.elo_rating, bl.games_played,
               RANK() OVER (ORDER BY bl.elo_rating DESC, bl.wins DESC) AS rank
        FROM bot_leaderboard bl
        JOIN users u ON u.id = bl.user_id
      ) ranked
      WHERE username = $1
    `, [username]);
    if (rankResult.rows.length) myRank = rankResult.rows[0];
  }

  res.json({ rows, myRank });
});

module.exports = router;
