const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'at', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'it',
  'its', 'that', 'this', 'after', 'over', 'into', 'amid', 'says', 'said',
  'will', 'new', 'up', 'out', 'his', 'her', 'their', 'about', 'than', 'more',
  'has', 'have', 'had', 'not', 'no', 'what', 'who', 'how', 'why', 'us',
]);

function keywords(title) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word))
  );
}

function jaccard(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

const SIMILARITY_THRESHOLD = 0.32;

/**
 * Groups articles into stories by title keyword overlap. Not true event-level
 * clustering (that needs heavier NLP) — a lightweight approximation that's good
 * enough to spot the same story reported across multiple outlets.
 */
function clusterArticles(articles) {
  const clusters = []; // { keywordSets: [Set,...], articles: [...] }

  for (const article of articles) {
    const kw = keywords(article.title);
    let best = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      for (const existingKw of cluster.keywordSets) {
        const score = jaccard(kw, existingKw);
        if (score > bestScore) {
          bestScore = score;
          best = cluster;
        }
      }
    }

    if (best && bestScore >= SIMILARITY_THRESHOLD) {
      best.articles.push(article);
      best.keywordSets.push(kw);
    } else {
      clusters.push({ keywordSets: [kw], articles: [article] });
    }
  }

  return clusters
    .map((c) => c.articles)
    .filter((group) => group.length >= 1)
    .sort((a, b) => b.length - a.length);
}

module.exports = { clusterArticles };
