const express = require('express');
const path = require('path');
const { fetchTopHeadlines } = require('../lib/newsSource');
const { clusterArticles } = require('../lib/cluster');
const { domainFromUrl, lookupBias } = require('../lib/bias');
const { summarizeStory, isLive: summariesLive } = require('../lib/summarize');
const { getOrBuild } = require('../lib/cache');
const votes = require('../lib/votes');

const sampleStories = require(path.join(__dirname, '..', 'data', 'sample-stories.json'));

const router = express.Router();

const MAX_STORIES = 10;
const MAX_SOURCES_PER_STORY = 8;

function articleToSource(article) {
  const domain = domainFromUrl(article.url);
  const bias = lookupBias(domain);
  return {
    name: article.sourceName || domain || 'Unknown source',
    domain,
    url: article.url,
    title: article.title,
    biasScore: bias.score,
    biasLabel: bias.label,
  };
}

async function buildFromSampleData() {
  const now = Date.now();
  const stories = sampleStories.map((story, i) => ({
    id: `sample-${i}`,
    headline: story.headline,
    summary: story.summary,
    generated: false,
    sourceCount: story.sources.length,
    // Sample data has no real publish time — stagger synthetic timestamps
    // (newest first, matching the bundled order) so "Most Recent" sort has
    // something meaningful to demonstrate against.
    publishedAt: new Date(now - i * 70 * 60 * 1000).toISOString(),
    sources: story.sources.map((s) => {
      const bias = lookupBias(s.domain);
      return {
        name: s.name,
        domain: s.domain,
        url: s.url,
        title: s.title,
        biasScore: bias.score,
        biasLabel: bias.label,
      };
    }),
  }));
  return { stories, sample: true, generatedAt: new Date().toISOString() };
}

function mostRecentPublishedAt(group) {
  const timestamps = group
    .map((a) => (a.publishedAt ? Date.parse(a.publishedAt) : NaN))
    .filter((t) => !Number.isNaN(t));
  if (timestamps.length === 0) return new Date().toISOString();
  return new Date(Math.max(...timestamps)).toISOString();
}

async function buildFromLiveData(articles) {
  const clusters = clusterArticles(articles)
    .filter((group) => group.length >= 1)
    .slice(0, MAX_STORIES);

  const stories = await Promise.all(
    clusters.map(async (group, i) => {
      const topic = group[0].title;
      const { headline, summary, generated } = await summarizeStory(topic, group);
      const sources = group.slice(0, MAX_SOURCES_PER_STORY).map(articleToSource);
      return {
        id: `live-${i}`,
        headline: headline || topic,
        summary,
        generated,
        sourceCount: group.length,
        publishedAt: mostRecentPublishedAt(group),
        sources,
      };
    })
  );

  return { stories, sample: false, generatedAt: new Date().toISOString() };
}

async function buildStories() {
  let live = false;
  let articles = [];
  try {
    const result = await fetchTopHeadlines();
    live = result.live;
    articles = result.articles;
  } catch (err) {
    console.error(`Live news fetch failed, falling back to sample data: ${err.message}`);
  }

  if (!live || articles.length === 0) {
    return buildFromSampleData();
  }

  return buildFromLiveData(articles);
}

async function buildStoriesFreshEdition() {
  const data = await buildStories();
  // Story ids are recycled per rebuild, so promote counts from the previous
  // edition no longer refer to the same content — start this edition at zero.
  votes.resetAll();
  return data;
}

router.get('/stories', async (req, res) => {
  try {
    const data = await getOrBuild(buildStoriesFreshEdition);
    const stories = data.stories.map((story) => ({ ...story, rank: votes.getRank(story.id) }));
    res.json({ ...data, stories, summariesGenerated: summariesLive() });
  } catch (err) {
    console.error(`Failed to build stories: ${err.stack}`);
    res.status(500).json({ error: 'Failed to load stories' });
  }
});

router.post('/stories/:id/promote', async (req, res) => {
  try {
    const data = await getOrBuild(buildStoriesFreshEdition);
    const exists = data.stories.some((story) => story.id === req.params.id);
    if (!exists) {
      return res.status(404).json({ error: 'Unknown story id' });
    }
    const rank = votes.promote(req.params.id);
    res.json({ id: req.params.id, rank });
  } catch (err) {
    console.error(`Failed to promote story: ${err.stack}`);
    res.status(500).json({ error: 'Failed to promote story' });
  }
});

module.exports = router;
