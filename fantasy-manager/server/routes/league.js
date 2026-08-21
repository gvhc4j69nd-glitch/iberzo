const express = require('express');
const multer = require('multer');
const { parseSpreadsheet } = require('../lib/parseSpreadsheet');
const { loadLeague, saveUpload, setMyTeam } = require('../lib/store');

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
    const league = saveUpload(parsed);
    res.json(league);
  } catch (err) {
    console.error(`Failed to parse upload: ${err.stack}`);
    res.status(422).json({ error: `Couldn't read that spreadsheet: ${err.message}` });
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
