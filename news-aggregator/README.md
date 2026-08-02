# ApageI

Aggregates today's top news stories, rewrites each one as a strictly factual,
non-partisan account, and lists which outlets are covering the story along
with an illustrative left-right lean rating (1-100) for each.

## How it works

1. **Fetch** — pulls top headlines from [NewsAPI.org](https://newsapi.org)
   across a broad, ideologically mixed set of outlets.
2. **Cluster** — groups articles covering the same event using headline
   keyword overlap (a lightweight approximation, not full NLP event
   clustering).
3. **Neutralize** — sends each cluster's headlines/snippets to Claude with
   instructions to produce a factual, non-editorializing summary, attributing
   contested claims rather than adjudicating them.
4. **Rate** — looks up each source's domain in `server/data/bias-ratings.json`,
   a small static table of illustrative lean scores (1 = furthest left, 50 =
   center, 100 = furthest right).

Without any API keys, the site runs out of the box using bundled sample
stories (`server/data/sample-stories.json`) so you can see the UI immediately.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and add NEWS_API_KEY / ANTHROPIC_API_KEY
npm start
```

Open http://localhost:8787.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEWS_API_KEY` | No | Enables live headlines from NewsAPI.org. Without it, sample data is served. |
| `ANTHROPIC_API_KEY` | No | Enables Claude-generated neutral summaries. Without it, summaries fall back to concatenated article descriptions. |
| `NEWS_API_SOURCES` | No | Comma-separated NewsAPI source IDs to widen ideological coverage beyond the default `country=us` feed. |
| `STORIES_CACHE_TTL_MINUTES` | No | How long to cache the built story list before refetching/re-summarizing (default 120, i.e. every 2 hours). |
| `PORT` | No | Server port (default 8787). |

## On the bias ratings

`server/data/bias-ratings.json` is a small, hand-maintained, illustrative
table — not a scientific or peer-reviewed measurement. It's loosely informed
by publicly discussed media-bias charts (AllSides, Ad Fontes Media) but is an
independent, simplified estimate. Treat the numbers as a rough signal, edit
the file to reflect your own judgment, and always read the original
reporting for full context.

## Project layout

```
news-aggregator/
  server/
    index.js            # Express app entrypoint
    routes/stories.js    # GET /api/stories
    lib/
      newsSource.js      # NewsAPI fetch + fallback detection
      cluster.js          # headline-similarity clustering
      summarize.js        # Claude neutral rewrite + extractive fallback
      bias.js              # domain -> lean score lookup
      cache.js             # in-memory TTL cache
    data/
      bias-ratings.json    # static outlet lean table
      sample-stories.json  # bundled demo data (no API keys needed)
  public/
    index.html, styles.css, app.js   # static frontend, no build step
```

This is a standalone app — it does not affect the Azul game deployment
(`railway.json` / `nixpacks.toml` at the repo root, which target
`server/`/`client/` in the repo root, not this directory).
