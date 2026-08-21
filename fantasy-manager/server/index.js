require('dotenv').config();
const express = require('express');
const path = require('path');
const leagueRouter = require('./routes/league');

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

app.listen(PORT, () => {
  console.log(`Fantasy Manager listening on port ${PORT}`);
});
