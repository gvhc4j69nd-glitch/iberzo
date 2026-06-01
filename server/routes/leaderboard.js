const express = require('express');
const { pool } = require('../db/schema');

const router = express.Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.username, l.wins, l.losses, l.games_played, l.total_score, l.elo_rating
    FROM leaderboard l
    JOIN users u ON u.id = l.user_id
    ORDER BY l.elo_rating DESC, l.wins DESC
    LIMIT 50
  `);
  res.json(rows);
});

module.exports = router;
