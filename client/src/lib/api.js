const BASE = import.meta.env.PROD
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

export async function fetchLeaderboard() {
  const res = await fetch(`${BASE}/leaderboard`);
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
