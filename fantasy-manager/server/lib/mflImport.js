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

function formatPlayerName(rawName) {
  // MFL's player export typically formats names as "Last, First".
  if (!rawName) return '';
  const parts = rawName.split(',').map((s) => s.trim());
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : rawName;
}

/**
 * Recursively collects objects that look like player references (a numeric
 * "id" field) from anywhere in a subtree. MFL's XML->JSON export collapses
 * single-item lists to a bare object instead of a one-element array, and
 * nests player lists differently across endpoints (e.g. freeAgents groups by
 * position in some league configs) — this avoids hard-coding a brittle path.
 */
function findPlayerRefs(node, depth = 0) {
  if (!node || depth > 6) return [];
  if (Array.isArray(node)) return node.flatMap((n) => findPlayerRefs(n, depth + 1));
  if (typeof node === 'object') {
    if (typeof node.id === 'string' && /^\d+$/.test(node.id)) return [node];
    return Object.values(node).flatMap((v) => findPlayerRefs(v, depth + 1));
  }
  return [];
}

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

/**
 * Imports a league's teams, rosters, and available players from MyFantasyLeague's
 * public export API. Requires no credentials for publicly-viewable leagues.
 */
async function importMflLeague({ leagueId, year }) {
  const leagueData = await mflFetch(MFL_API_HOST, year, 'league', leagueId);
  const league = leagueData.league;
  if (!league) throw new Error('Unexpected MFL response: missing "league"');

  const host = league.baseURL || MFL_API_HOST;
  const franchises = toArray(league.franchises && league.franchises.franchise);

  // TYPE=players and TYPE=adp are league-agnostic reference data and must go
  // through api.myfantasyleague.com; only league-scoped calls use the
  // league's own baseURL (MFL rejects the former on the latter host).
  const [playersData, rostersData, freeAgentsData, adpData] = await Promise.all([
    mflFetch(MFL_API_HOST, year, 'players', null, { DETAILS: '1' }),
    mflFetch(host, year, 'rosters', leagueId),
    mflFetch(host, year, 'freeAgents', leagueId),
    mflFetch(MFL_API_HOST, year, 'adp', null).catch((err) => {
      console.error(`MFL ADP fetch failed (non-fatal, ranking will be unavailable): ${err.message}`);
      return null;
    }),
  ]);

  const playerById = new Map();
  for (const p of toArray(playersData.players && playersData.players.player)) {
    playerById.set(p.id, {
      name: formatPlayerName(p.name),
      nflTeam: p.team || '',
      position: normalizePosition(p.position),
    });
  }
  if (playerById.size === 0) {
    throw new Error(
      'MFL returned no entries in the player database (TYPE=players) — every roster/free-agent would resolve as "Unknown player". This usually means the request was blocked or rate-limited rather than a parsing issue.'
    );
  }

  const adpById = new Map();
  if (adpData) {
    for (const ref of findPlayerRefs(adpData.adp)) {
      const n = Number(ref.averagePick ?? ref.average_pick ?? ref.adp);
      if (Number.isFinite(n)) adpById.set(ref.id, n);
    }
  }

  function resolvePlayer(id, rosterStatus) {
    const base = playerById.get(id) || { name: `Unknown player (${id})`, nflTeam: '', position: '' };
    return {
      ...base,
      ranking: adpById.has(id) ? adpById.get(id) : null,
      rosterStatus: rosterStatus || null,
    };
  }

  const rosterByFranchiseId = new Map();
  for (const f of toArray(rostersData.rosters && rostersData.rosters.franchise)) {
    const players = toArray(f.player).map((p) => resolvePlayer(p.id, p.status));
    rosterByFranchiseId.set(f.id, players);
  }

  const teams = franchises.map((f) => ({
    name: f.name,
    players: rosterByFranchiseId.get(f.id) || [],
  }));

  const freeAgentIds = Array.from(new Set(findPlayerRefs(freeAgentsData.freeAgents).map((p) => p.id)));
  const availablePlayers = freeAgentIds.map((id) => resolvePlayer(id, null));

  return {
    teams,
    availablePlayers,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { importMflLeague };
