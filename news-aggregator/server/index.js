require('dotenv').config();
const express = require('express');
const path = require('path');
const storiesRouter = require('./routes/stories');

const app = express();
const PORT = process.env.PORT || 8787;

app.use('/api', storiesRouter);
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`Neutral News aggregator listening on port ${PORT}`);
  if (!process.env.NEWS_API_KEY) {
    console.log('NEWS_API_KEY not set — serving bundled sample stories.');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY not set — neutral summaries will use the extractive fallback.');
  }
});
