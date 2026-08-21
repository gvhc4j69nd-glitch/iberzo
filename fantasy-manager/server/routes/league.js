const express = require('express');
const multer = require('multer');
const { parseSpreadsheet } = require('../lib/parseSpreadsheet');
const { importMflLeague } = require('../lib/mflImport');
const { getWeeklyLineupData } = require('../lib/mflWeekly');
const { loadLeague, saveImport, setMyTeam } = require('../lib/store');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okExt = /\.xlsx$/i.test(file.originalname);
    const okMime = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    cb(null, okExt || okMime);
  },
});

router.get('/league', (req, res) => {
  try {
    res.json(loadLeague());
  } catch (err) {
    console.error(`Failed to load league: ${err.stack}`);
    res.status(500).json({ error: 'Failed to load league data' });
  }
});

router.post('/upload', upload.single('spreadsheet'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Upload a .xlsx file as "spreadsheet"' });
  }
  try {
    const parsed = await parseSpreadsheet(req.file.buffer);
    if (parsed.teams.length === 0 && parsed.availablePlayers.length === 0) {
      return res.status(422).json({ error: 'No player rows found. Check that each sheet has a header row with player name/team/position/ranking columns.' });
    }
    const league = saveImport(parsed, 'upload');
    res.json(league);
  } catch (err) {
    console.error(`Failed to parse upload: ${err.stack}`);
    res.status(422).json({ error: `Couldn't read that spreadsheet: ${err.message}` });
  }
});

router.post('/import/mfl', express.json(), async (req, res) => {
  const leagueId = (req.body && req.body.leagueId) || process.env.MFL_LEAGUE_ID;
  const year = (req.body && req.body.year) || process.env.MFL_SEASON || String(new Date().getFullYear());
  if (!leagueId) {
    return res.status(400).json({ error: 'leagueId is required' });
  }
  try {
    const parsed = await importMflLeague({ leagueId, year });
    if (parsed.teams.length === 0) {
      return res.status(422).json({ error: 'MFL returned no franchises for that league/year. Double-check the league ID and season.' });
    }
    const league = saveImport({ ...parsed, mflYear: year, mflLeagueId: leagueId }, 'mfl');
    res.json(league);
  } catch (err) {
    console.error(`MFL import failed: ${err.stack}`);
    res.status(502).json({ error: `Couldn't import from MFL: ${err.message}` });
  }
});

router.get('/lineup', async (req, res) => {
  const week = req.query.week;
  if (!week) {
    return res.status(400).json({ error: 'week is required' });
  }
  const league = loadLeague();
  if (league.source !== 'mfl') {
    return res.status(400).json({ error: 'Weekly lineup check requires a league imported from MFL.' });
  }
  if (!league.myTeamName) {
    return res.status(400).json({ error: 'Pick which team is yours before checking a weekly lineup.' });
  }
  const myTeam = league.teams.find((t) => t.name === league.myTeamName);
  try {
    const data = await getWeeklyLineupData({ year: league.mflYear, week, myTeam });
    res.json({ ...data, starterSlots: league.starterSlots || {}, starterCount: league.starterCount || 0 });
  } catch (err) {
    console.error(`Weekly lineup check failed: ${err.stack}`);
    res.status(502).json({ error: `Couldn't check this week's status: ${err.message}` });
  }
});

router.post('/league/my-team', express.json(), (req, res) => {
  const { teamName } = req.body || {};
  if (!teamName) {
    return res.status(400).json({ error: 'teamName is required' });
  }
  try {
    res.json(setMyTeam(teamName));
  } catch (err) {
    if (err.code === 'UNKNOWN_TEAM') {
      return res.status(400).json({ error: err.message });
    }
    console.error(`Failed to set my team: ${err.stack}`);
    res.status(500).json({ error: 'Failed to save team selection' });
  }
});

module.exports = router;
