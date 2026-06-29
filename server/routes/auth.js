const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../db/schema');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../lib/email');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function createAndSendVerificationToken(userId, email, username) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await pool.query(`
    INSERT INTO email_verification_tokens (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
  `, [userId, token, expiresAt]);
  await sendVerificationEmail(email, username, token);
}

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (!EMAIL_RE.test(email))
    return res.status(400).json({ error: 'Please enter a valid email address' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hash]
    );
    const userId = rows[0].id;
    await pool.query('INSERT INTO leaderboard (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);

    // Email delivery is best-effort — never let it block account creation
    createAndSendVerificationToken(userId, email, username).catch(err =>
      console.error('Failed to send verification email on register:', err)
    );

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

// GET /api/auth/me — current user's profile, used to drive the
// "please verify your email" reminder banner
router.get('/me', authMiddleware, async (req, res) => {
  const { rows } = await pool.query('SELECT username, email, email_verified FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json({ username: rows[0].username, email: rows[0].email, emailVerified: rows[0].email_verified });
});

router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const { rows } = await pool.query(
    'SELECT user_id, expires_at FROM email_verification_tokens WHERE token = $1',
    [token]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Invalid or already-used verification link' });
  if (new Date(rows[0].expires_at) < new Date())
    return res.status(400).json({ error: 'This verification link has expired' });

  await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [rows[0].user_id]);
  await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [rows[0].user_id]);
  res.json({ ok: true });
});

router.post('/resend-verification', authMiddleware, async (req, res) => {
  const { rows } = await pool.query('SELECT email, username, email_verified FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  if (rows[0].email_verified) return res.json({ ok: true, alreadyVerified: true });

  await createAndSendVerificationToken(req.user.id, rows[0].email, rows[0].username);
  res.json({ ok: true });
});

// Always respond with a generic success message, regardless of whether the
// email is actually registered — don't let this endpoint leak which emails
// have accounts.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });

  const { rows } = await pool.query('SELECT id, username FROM users WHERE email = $1', [email]);
  if (rows[0]) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await pool.query(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
    `, [rows[0].id, token, expiresAt]);
    sendPasswordResetEmail(email, rows[0].username, token).catch(err =>
      console.error('Failed to send password reset email:', err)
    );
  }

  res.json({ ok: true, message: 'If that email is registered, a password reset link has been sent.' });
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'All fields required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const { rows } = await pool.query(
    'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = $1',
    [token]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Invalid or already-used reset link' });
  if (new Date(rows[0].expires_at) < new Date())
    return res.status(400).json({ error: 'This reset link has expired' });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, rows[0].user_id]);
  await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [rows[0].user_id]);
  res.json({ ok: true });
});

module.exports = router;
