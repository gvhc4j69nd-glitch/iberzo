const fs = require('fs');
const path = require('path');
const db = require('./db');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEAGUE_PATH = path.join(DATA_DIR, 'league.json');
const SAMPLE_PATH = path.join(DATA_DIR, 'sample-league.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function loadLeague() {
  if (db.isConfigured()) {
    const fromDb = await db.loadLeagueFromDb();
    if (fromDb) return fromDb;
    return readJson(SAMPLE_PATH);
  }
  if (fs.existsSync(LEAGUE_PATH)) return readJson(LEAGUE_PATH);
  return readJson(SAMPLE_PATH);
}

async function saveLeague(league) {
  if (db.isConfigured()) {
    await db.saveLeagueToDb(league);
    return;
  }
  fs.writeFileSync(LEAGUE_PATH, JSON.stringify(league, null, 2));
}

async function saveImport(parsed, source) {
  const league = {
    ...parsed,
    source,
    myTeamName: null,
  };
  await saveLeague(league);
  return league;
}

async function setMyTeam(teamName) {
  const league = await loadLeague();
  const exists = league.teams.some((t) => t.name === teamName);
  if (!exists) {
    const err = new Error(`Unknown team "${teamName}"`);
    err.code = 'UNKNOWN_TEAM';
    throw err;
  }
  const updated = { ...league, myTeamName: teamName };
  await saveLeague(updated);
  return updated;
}

module.exports = { loadLeague, saveImport, setMyTeam };
