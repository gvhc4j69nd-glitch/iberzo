# Fantasy Manager

Upload your fantasy football league as a spreadsheet and see every roster —
yours, your league-mates', and the available player pool — in one place.

## How it works

1. **Upload** a `.xlsx` workbook with one sheet per fantasy team's roster,
   plus one sheet for available/free-agent players (matched by name —
   "Available", "Free Agents", "Waivers", etc.). Each sheet needs a header
   row with these columns (flexible naming):
   - **Player Name** (or "Name")
   - **Team** (NFL team, e.g. "BUF")
   - **Position** (e.g. "QB", "RB", "WR", "TE", "K", "DST")
   - **Ranking** (a number — lower is better)
2. **Pick which roster is yours** from the detected team sheets.
3. **Browse**: your roster grouped by position, every other team's roster
   (collapsible), and a searchable/filterable available-players pool.

Without any upload, the site runs on a bundled sample league so you can see
the UI immediately.

## Setup

```bash
npm install
npm start
```

Open http://localhost:8788.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | No | Server port (default 8788). |

## Data & persistence

Uploaded data is parsed in memory and written to `server/data/league.json`
(gitignored — it's your private league data) so it survives a server
restart. Uploading a new spreadsheet replaces it entirely and clears the
"which roster is mine" selection, since team names may have changed.

## Project layout

```
fantasy-manager/
  server/
    index.js              # Express app entrypoint
    routes/league.js       # GET /api/league, POST /api/upload, POST /api/league/my-team
    lib/
      parseSpreadsheet.js  # multi-sheet .xlsx -> teams / available players
      store.js              # persistence + "my team" selection
    data/
      sample-league.json    # bundled demo league (no upload needed)
  public/
    index.html, styles.css, app.js   # static frontend, no build step
```

## Roadmap

This is step one: get league data in and organized. Planned next:

- **Draft recommendations** — rank available players for your next pick,
  weighing your roster's positional needs against the ranking column.
- **Weekly lineup recommendations** — suggest who to start, factoring in
  each player's current injury/health status and their opponent's matchup
  difficulty for the week. This needs two data sources the spreadsheet
  doesn't carry today: live injury status and the weekly schedule/matchups
  — likely a sports-data API, or a manually-maintained status column, to
  be decided when we get there.
