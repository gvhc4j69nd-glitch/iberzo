const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_BASE = 'https://newsapi.org/v2';

// Curated NewsAPI source IDs spanning the ideological spectrum, used alongside the
// default country feed to pull in outlets that a plain top-headlines call tends to
// under-represent. Override with NEWS_API_SOURCES (comma-separated NewsAPI source IDs).
const DEFAULT_SOURCES = (
  process.env.NEWS_API_SOURCES ||
  'reuters,associated-press,bbc-news,the-wall-street-journal,the-washington-post,' +
  'cnn,fox-news,nbc-news,cbs-news,abc-news,msnbc,politico,the-hill,newsweek,' +
  'breitbart-news,national-review,al-jazeera-english,bloomberg,business-insider,axios'
).trim();

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'X-Api-Key': NEWS_API_KEY } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`NewsAPI request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

function normalizeArticle(article) {
  if (!article || !article.url || !article.title) return null;
  return {
    title: article.title.replace(/\s*-\s*[^-]+$/, '').trim(),
    description: article.description || '',
    url: article.url,
    sourceName: article.source && article.source.name,
    publishedAt: article.publishedAt,
  };
}

async function fetchTopHeadlines() {
  if (!NEWS_API_KEY) {
    return { articles: [], live: false };
  }

  const requests = [
    fetchJson(`${NEWS_API_BASE}/top-headlines?country=us&pageSize=100`),
  ];
  if (DEFAULT_SOURCES) {
    requests.push(
      fetchJson(`${NEWS_API_BASE}/top-headlines?sources=${encodeURIComponent(DEFAULT_SOURCES)}&pageSize=100`)
    );
  }

  const results = await Promise.allSettled(requests);
  const seen = new Set();
  const articles = [];

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const items = result.value && result.value.articles;
    if (!Array.isArray(items)) continue;
    for (const raw of items) {
      const article = normalizeArticle(raw);
      if (!article || seen.has(article.url)) continue;
      seen.add(article.url);
      articles.push(article);
    }
  }

  if (articles.length === 0) {
    // Every request failed (bad key, rate limit, network) — surface as non-live
    // rather than throwing, so the route can fall back to sample data.
    const allFailed = results.every((r) => r.status === 'rejected');
    if (allFailed) return { articles: [], live: false };
  }

  return { articles, live: true };
}

module.exports = { fetchTopHeadlines };
