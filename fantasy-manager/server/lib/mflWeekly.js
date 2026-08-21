const { mflFetch, toArray, MFL_API_HOST } = require('./mflClient');
const { fetchInjuryMap } = require('./mflInjuries');

function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetches this week's injury report and NFL schedule (both league-agnostic,
 * so no league ID needed) and annotates myTeam's players with current
 * injury status and their opponent for the week — fetched fresh each time
 * this is called, not from the cached import.
 */
async function getWeeklyLineupData({ year, week, myTeam }) {
  const [injuryById, scheduleData] = await Promise.all([
    fetchInjuryMap(year),
    mflFetch(MFL_API_HOST, year, 'nflSchedule', null, { W: week }),
  ]);

  const opponentByTeam = new Map();
  for (const matchup of toArray(scheduleData.nflSchedule && scheduleData.nflSchedule.matchup)) {
    const teams = toArray(matchup.team);
    if (teams.length === 2) {
      const [a, b] = teams;
      opponentByTeam.set(a.id, {
        opponent: b.id,
        isHome: a.isHome === '1',
        oppPassDefenseRank: numOrNull(b.passDefenseRank),
        oppRushDefenseRank: numOrNull(b.rushDefenseRank),
      });
      opponentByTeam.set(b.id, {
        opponent: a.id,
        isHome: b.isHome === '1',
        oppPassDefenseRank: numOrNull(a.passDefenseRank),
        oppRushDefenseRank: numOrNull(a.rushDefenseRank),
      });
    } else if (teams.length === 1) {
      // A single-team "matchup" entry represents a bye week.
      opponentByTeam.set(teams[0].id, {
        opponent: null,
        isHome: null,
        oppPassDefenseRank: null,
        oppRushDefenseRank: null,
      });
    }
  }

  const players = myTeam.players.map((p) => {
    const injury = p.mflId ? injuryById.get(p.mflId) : null;
    const matchup = opponentByTeam.get(p.nflTeam);
    return {
      ...p,
      injuryStatus: injury ? injury.status : null,
      injuryDetails: injury ? injury.details : null,
      opponent: matchup ? matchup.opponent : null,
      isHome: matchup ? matchup.isHome : null,
      isBye: Boolean(matchup && matchup.opponent === null),
      oppPassDefenseRank: matchup ? matchup.oppPassDefenseRank : null,
      oppRushDefenseRank: matchup ? matchup.oppRushDefenseRank : null,
    };
  });

  return { week, players, generatedAt: new Date().toISOString() };
}

module.exports = { getWeeklyLineupData };
