const PROD_URL = 'https://www.iberzo.com';

const BASE = (typeof window !== 'undefined' && window.Capacitor)
  ? `${PROD_URL}/api`
  : import.meta.env.PROD
    ? '/api'
    : `http://${window.location.hostname}:3001/api`;

export async function register(username, email, password) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function fetchLeaderboard(username) {
  const qs = username ? `?username=${encodeURIComponent(username)}` : '';
  const res = await fetch(`${BASE}/leaderboard${qs}`);
  return res.json();
}

export async function fetchMyRooms(token) {
  const res = await fetch(`${BASE}/my-rooms`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function changePassword(token, currentPassword, newPassword) {
  const res = await fetch(`${BASE}/auth/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return res.json();
}

export async function searchUsers(token, q) {
  const res = await fetch(`${BASE}/users/search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchBotStats(token) {
  const res = await fetch(`${BASE}/bot-stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchFriends(token) {
  const res = await fetch(`${BASE}/friends`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchNotifications(token) {
  const res = await fetch(`${BASE}/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function markNotificationRead(token, id) {
  const res = await fetch(`${BASE}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function markAllNotificationsRead(token) {
  const res = await fetch(`${BASE}/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function deleteNotification(token, id) {
  const res = await fetch(`${BASE}/notifications/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
