const { mflFetch, toArray, normalizePosition, MFL_API_HOST } = require('./mflClient');
const { fetchInjuryMap } = require('./mflInjuries');

function parseLimit(limitStr) {
  if (!limitStr) return { min: 0, max: 0 };
  const parts = String(limitStr).split('-').map(Number);
  if (parts.length === 1) {
    const n = Number.isFinite(parts[0]) ? parts[0] : 0;
    return { min: n, max: n };
  }
  const min = Number.isFinite(parts[0]) ? parts[0] : 0;
  const max = Number.isFinite(parts[1]) ? parts[1] : min;
  return { min, max };
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

  // Rough depth target per position (~2x the league's max starters at that
  // spot) — a heuristic for "how thin are you here", not the league's actual
  // roster/bench rules. starterSlots keeps each position's real {min,max}
  // starter range (e.g. RB "1-4" -> min 1, max 4) — positions where max>min
  // share a combined FLEX pool rather than each getting `max` independent
  // slots, so both numbers are needed for the weekly start/bench logic.
  const positionTargets = {};
  const starterSlots = {};
  for (const slot of toArray(league.starters && league.starters.position)) {
    const key = normalizePosition(slot.name);
    const { min, max } = parseLimit(slot.limit);
    if (key && max > 0) {
      positionTargets[key] = Math.max(positionTargets[key] || 0, max * 2, max + 1);
      const existing = starterSlots[key] || { min: 0, max: 0 };
      starterSlots[key] = { min: Math.max(existing.min, min), max: Math.max(existing.max, max) };
    }
  }
  const starterCount = Number(league.starters && league.starters.count) || 0;

  // TYPE=players and TYPE=adp are league-agnostic reference data and must go
  // through api.myfantasyleague.com; only league-scoped calls use the
  // league's own baseURL (MFL rejects the former on the latter host).
  const [playersData, rostersData, freeAgentsData, adpData, injuryById, byeWeeksData] = await Promise.all([
    mflFetch(MFL_API_HOST, year, 'players', null, { DETAILS: '1' }),
    mflFetch(host, year, 'rosters', leagueId),
    mflFetch(host, year, 'freeAgents', leagueId),
    mflFetch(MFL_API_HOST, year, 'adp', null).catch((err) => {
      console.error(`MFL ADP fetch failed (non-fatal, ranking will be unavailable): ${err.message}`);
      return null;
    }),
    fetchInjuryMap(year).catch((err) => {
      console.error(`MFL injuries fetch failed (non-fatal, injury status will be unavailable): ${err.message}`);
      return new Map();
    }),
    mflFetch(MFL_API_HOST, year, 'nflByeWeeks', null).catch((err) => {
      console.error(`MFL bye weeks fetch failed (non-fatal, bye weeks will be unavailable): ${err.message}`);
      return null;
    }),
  ]);

  const byeWeekByTeam = new Map();
  if (byeWeeksData) {
    for (const t of toArray(byeWeeksData.nflByeWeeks && byeWeeksData.nflByeWeeks.team)) {
      const week = Number(t.bye_week);
      if (t.id && Number.isFinite(week)) byeWeekByTeam.set(t.id, week);
    }
  }

  const playerById = new Map();
  for (const p of toArray(playersData.players && playersData.players.player)) {
    playerById.set(p.id, {
      name: formatPlayerName(p.name),
      nflTeam: p.team || '',
      position: normalizePosition(p.position),
      espnId: p.espn_id || null,
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
    const base = playerById.get(id) || { name: `Unknown player (${id})`, nflTeam: '', position: '', espnId: null };
    const injury = injuryById.get(id);
    return {
      ...base,
      mflId: id,
      ranking: adpById.has(id) ? adpById.get(id) : null,
      rosterStatus: rosterStatus || null,
      injuryStatus: injury ? injury.status : null,
      injuryDetails: injury ? injury.details : null,
      byeWeek: byeWeekByTeam.has(base.nflTeam) ? byeWeekByTeam.get(base.nflTeam) : null,
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
    positionTargets,
    starterSlots,
    starterCount,
  };
}

module.exports = { importMflLeague };
