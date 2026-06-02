const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/schema');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields required' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hash]
    );
    const userId = rows[0].id;
    await pool.query('INSERT INTO leaderboard (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);

    const token = jwt.sign({ id: userId, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Username or email already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

router.patch('/password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
