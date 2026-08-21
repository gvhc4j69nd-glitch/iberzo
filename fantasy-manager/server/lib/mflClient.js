const MFL_API_HOST = 'https://api.myfantasyleague.com';
const REQUEST_TIMEOUT_MS = 15000;

function toArray(x) {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function normalizePosition(pos) {
  const p = (pos || '').toUpperCase();
  if (p === 'PK') return 'K';
  if (p === 'DEF') return 'DST';
  return p;
}

/**
 * Fetches one MFL export endpoint. TYPE=players and TYPE=adp (and
 * TYPE=injuries) are league-agnostic reference data and must go through
 * api.myfantasyleague.com; league-scoped calls (rosters, freeAgents) use the
 * league's own baseURL instead (pass it as `host`).
 */
async function mflFetch(host, year, type, leagueId, extraParams = {}) {
  const params = new URLSearchParams({ TYPE: type, JSON: '1', ...extraParams });
  if (leagueId) params.set('L', leagueId);
  const url = `${host}/${year}/export?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; fantasy-manager/1.0; +https://github.com/gvhc4j69nd-glitch/apagei)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`MFL request failed (TYPE=${type}): HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.error) {
      const message = (data.error && data.error.$t) || JSON.stringify(data.error);
      throw new Error(`MFL error (TYPE=${type}): ${message}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { MFL_API_HOST, toArray, normalizePosition, mflFetch };
