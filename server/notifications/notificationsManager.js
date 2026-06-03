const { pool } = require('../db/schema');

async function createNotification(userId, type, subject, body = null, data = null) {
  const { rows } = await pool.query(`
    INSERT INTO notifications (user_id, type, subject, body, data)
    VALUES ($1, $2, $3, $4, $5) RETURNING id
  `, [userId, type, subject, body, data ? JSON.stringify(data) : null]);
  return { ok: true, id: rows[0].id };
}

async function getNotifications(userId) {
  const { rows } = await pool.query(`
    SELECT id, type, subject, body, data, read, created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [userId]);
  return rows.map(r => ({ ...r, data: r.data ? (typeof r.data === 'string' ? JSON.parse(r.data) : r.data) : null }));
}

async function getUnreadCount(userId) {
  const { rows } = await pool.query(`
    SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false
  `, [userId]);
  return parseInt(rows[0].count, 10);
}

async function markRead(notificationId, userId) {
  await pool.query(`
    UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2
  `, [notificationId, userId]);
  return { ok: true };
}

async function markAllRead(userId) {
  await pool.query(`UPDATE notifications SET read = true WHERE user_id = $1`, [userId]);
  return { ok: true };
}

async function deleteNotification(notificationId, userId) {
  await pool.query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [notificationId, userId]);
  return { ok: true };
}

module.exports = {
  createNotification, getNotifications, getUnreadCount,
  markRead, markAllRead, deleteNotification,
};
