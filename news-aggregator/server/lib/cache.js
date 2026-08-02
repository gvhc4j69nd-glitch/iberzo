const TTL_MS = Number(process.env.STORIES_CACHE_TTL_MINUTES || 30) * 60 * 1000;

let cached = null; // { data, expiresAt }
let inFlight = null;

/**
 * Memoizes the result of `build()` for TTL_MS. Concurrent callers during a
 * miss share the same in-flight promise instead of triggering duplicate
 * NewsAPI/Anthropic calls.
 */
async function getOrBuild(build) {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = build()
    .then((data) => {
      cached = { data, expiresAt: Date.now() + TTL_MS };
      return data;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

function clear() {
  cached = null;
}

module.exports = { getOrBuild, clear };
