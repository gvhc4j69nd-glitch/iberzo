const { pool } = require('../db/schema');

// Send a friend request from requesterId to addressee username
async function sendFriendRequest(requesterId, addresseeUsername) {
  const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [addresseeUsername]);
  if (!userRes.rows.length) return { error: 'User not found' };
  const addresseeId = userRes.rows[0].id;
  if (addresseeId === requesterId) return { error: 'Cannot add yourself' };

  // Check if friendship already exists either direction
  const existing = await pool.query(`
    SELECT status FROM friendships
    WHERE (requester_id = $1 AND addressee_id = $2)
       OR (requester_id = $2 AND addressee_id = $1)
  `, [requesterId, addresseeId]);
  if (existing.rows.length) {
    const s = existing.rows[0].status;
    if (s === 'accepted') return { error: 'Already friends' };
    if (s === 'pending')  return { error: 'Request already sent' };
  }

  await pool.query(`
    INSERT INTO friendships (requester_id, addressee_id, status)
    VALUES ($1, $2, 'pending')
    ON CONFLICT (requester_id, addressee_id) DO UPDATE SET status = 'pending'
  `, [requesterId, addresseeId]);

  return { ok: true, addresseeId };
}

async function acceptFriendRequest(addresseeId, requesterId) {
  const res = await pool.query(`
    UPDATE friendships SET status = 'accepted'
    WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'
    RETURNING id
  `, [requesterId, addresseeId]);
  if (!res.rows.length) return { error: 'Request not found' };
  return { ok: true };
}

async function declineFriendRequest(addresseeId, requesterId) {
  await pool.query(`
    DELETE FROM friendships
    WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'
  `, [requesterId, addresseeId]);
  return { ok: true };
}

async function removeFriend(userId, friendId) {
  await pool.query(`
    DELETE FROM friendships
    WHERE (requester_id = $1 AND addressee_id = $2)
       OR (requester_id = $2 AND addressee_id = $1)
  `, [userId, friendId]);
  return { ok: true };
}

// Returns { friends, incoming, outgoing }
async function getFriendData(userId) {
  const { rows } = await pool.query(`
    SELECT
      f.id, f.status, f.created_at,
      f.requester_id, ru.username AS requester_username,
      f.addressee_id, au.username AS addressee_username
    FROM friendships f
    JOIN users ru ON ru.id = f.requester_id
    JOIN users au ON au.id = f.addressee_id
    WHERE f.requester_id = $1 OR f.addressee_id = $1
    ORDER BY f.created_at DESC
  `, [userId]);

  const friends  = [];
  const incoming = [];
  const outgoing = [];

  for (const r of rows) {
    const iAmRequester = r.requester_id === userId;
    const other = {
      id:       iAmRequester ? r.addressee_id       : r.requester_id,
      username: iAmRequester ? r.addressee_username : r.requester_username,
    };
    if (r.status === 'accepted') {
      friends.push(other);
    } else if (r.status === 'pending') {
      if (iAmRequester) outgoing.push(other);
      else              incoming.push({ ...other, requesterId: r.requester_id });
    }
  }

  return { friends, incoming, outgoing };
}

// Store a game invite (for offline delivery)
async function createGameInvite(fromUserId, toUserId, roomId) {
  // Clear old pending invites from same sender to same recipient
  await pool.query(`
    DELETE FROM game_invites
    WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'
  `, [fromUserId, toUserId]);

  const { rows } = await pool.query(`
    INSERT INTO game_invites (from_user_id, to_user_id, room_id, status)
    VALUES ($1, $2, $3, 'pending') RETURNING id
  `, [fromUserId, toUserId, roomId]);
  return { ok: true, inviteId: rows[0].id };
}

async function respondGameInvite(inviteId, toUserId, accept) {
  const status = accept ? 'accepted' : 'declined';
  const res = await pool.query(`
    UPDATE game_invites SET status = $1
    WHERE id = $2 AND to_user_id = $3 AND status = 'pending'
    RETURNING room_id, from_user_id
  `, [status, inviteId, toUserId]);
  if (!res.rows.length) return { error: 'Invite not found' };
  return { ok: true, roomId: res.rows[0].room_id, fromUserId: res.rows[0].from_user_id };
}

// Get pending game invites for a user (for login delivery)
async function getPendingGameInvites(userId) {
  const { rows } = await pool.query(`
    SELECT gi.id, gi.room_id, gi.created_at, u.username AS from_username
    FROM game_invites gi
    JOIN users u ON u.id = gi.from_user_id
    WHERE gi.to_user_id = $1 AND gi.status = 'pending'
    ORDER BY gi.created_at DESC
  `, [userId]);
  return rows;
}

module.exports = {
  sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  removeFriend, getFriendData,
  createGameInvite, respondGameInvite, getPendingGameInvites,
};
