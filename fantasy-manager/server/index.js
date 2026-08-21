require('dotenv').config();
const express = require('express');
const path = require('path');
const leagueRouter = require('./routes/league');
const db = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 8788;

app.use('/api', leagueRouter);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: `Upload failed: ${err.message}` });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Unexpected server error' });
});

(async () => {
  if (db.isConfigured()) {
    await db.ensureSchema();
    console.log('Connected to Postgres — league data will persist across restarts.');
  } else {
    console.log('DATABASE_URL not set — falling back to local server/data/league.json.');
  }
  app.listen(PORT, () => {
    console.log(`Fantasy Manager listening on port ${PORT}`);
  });
})();
