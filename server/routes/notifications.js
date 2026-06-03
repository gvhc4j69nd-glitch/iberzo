const express = require('express');
const jwt = require('jsonwebtoken');
const { getNotifications, getUnreadCount, markRead, markAllRead, deleteNotification, createNotification } = require('../notifications/notificationsManager');

const router = express.Router();

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

router.get('/', auth, async (req, res) => {
  res.json(await getNotifications(req.user.id));
});

router.get('/unread-count', auth, async (req, res) => {
  res.json({ count: await getUnreadCount(req.user.id) });
});

router.patch('/:id/read', auth, async (req, res) => {
  res.json(await markRead(req.params.id, req.user.id));
});

router.patch('/read-all', auth, async (req, res) => {
  res.json(await markAllRead(req.user.id));
});

router.delete('/:id', auth, async (req, res) => {
  res.json(await deleteNotification(req.params.id, req.user.id));
});

// System broadcast (simple admin key check)
router.post('/broadcast', async (req, res) => {
  const { adminKey, subject, body } = req.body;
  if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  const { pool } = require('../db/schema');
  const { rows: users } = await pool.query('SELECT id FROM users');
  await Promise.all(users.map(u => createNotification(u.id, 'system', subject, body)));
  res.json({ ok: true, count: users.length });
});

module.exports = router;
