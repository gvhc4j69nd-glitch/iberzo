// In-memory "promote this story" counters. Scoped to the current edition:
// resetAll() is called whenever the story list is rebuilt (see routes/stories.js),
// since story ids are recycled indices (live-0..live-9 / sample-0..sample-5) that
// point at different content after every cache refresh — carrying old counts
// forward would attribute one story's promotions to whatever happens to land
// on the same index next cycle.
const votes = new Map();

function getRank(id) {
  return votes.get(id) || 0;
}

function promote(id) {
  const next = (votes.get(id) || 0) + 1;
  votes.set(id, next);
  return next;
}

function resetAll() {
  votes.clear();
}

module.exports = { getRank, promote, resetAll };
