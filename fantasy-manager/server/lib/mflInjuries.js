const { mflFetch, toArray, MFL_API_HOST } = require('./mflClient');

/**
 * Fetches MFL's league-wide injury report (not roster/league-scoped) and
 * returns it as a Map keyed by player id -> {status, details}.
 */
async function fetchInjuryMap(year) {
  const injuriesData = await mflFetch(MFL_API_HOST, year, 'injuries', null);
  const injuryById = new Map();
  for (const inj of toArray(injuriesData.injuries && injuriesData.injuries.injury)) {
    injuryById.set(inj.id, { status: inj.status, details: inj.details });
  }
  return injuryById;
}

module.exports = { fetchInjuryMap };
