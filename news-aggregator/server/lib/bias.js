const ratings = require('../data/bias-ratings.json').outlets;

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function labelForScore(score) {
  if (score <= 20) return 'Left';
  if (score <= 40) return 'Lean Left';
  if (score <= 60) return 'Center';
  if (score <= 80) return 'Lean Right';
  return 'Right';
}

function lookupBias(domain) {
  const entry = ratings[domain];
  if (!entry) return { score: null, label: 'Unrated' };
  return { score: entry.score, label: labelForScore(entry.score) };
}

module.exports = { domainFromUrl, lookupBias, labelForScore };
