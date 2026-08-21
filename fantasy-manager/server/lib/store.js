const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEAGUE_PATH = path.join(DATA_DIR, 'league.json');
const SAMPLE_PATH = path.join(DATA_DIR, 'sample-league.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadLeague() {
  if (fs.existsSync(LEAGUE_PATH)) return readJson(LEAGUE_PATH);
  return readJson(SAMPLE_PATH);
}

function saveLeague(league) {
  fs.writeFileSync(LEAGUE_PATH, JSON.stringify(league, null, 2));
}

function saveImport(parsed, source) {
  const league = {
    ...parsed,
    source,
    myTeamName: null,
  };
  saveLeague(league);
  return league;
}

function setMyTeam(teamName) {
  const league = loadLeague();
  const exists = league.teams.some((t) => t.name === teamName);
  if (!exists) {
    const err = new Error(`Unknown team "${teamName}"`);
    err.code = 'UNKNOWN_TEAM';
    throw err;
  }
  const updated = { ...league, myTeamName: teamName };
  saveLeague(updated);
  return updated;
}

module.exports = { loadLeague, saveImport, setMyTeam };
