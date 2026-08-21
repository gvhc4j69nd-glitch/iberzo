# Fantasy Manager

Upload your fantasy football league as a spreadsheet and see every roster —
yours, your league-mates', and the available player pool — in one place.

## How it works

Get league data in one of two ways:

1. **Upload** a `.xlsx` workbook with one sheet per fantasy team's roster,
   plus one sheet for available/free-agent players (matched by name —
   "Available", "Free Agents", "Waivers", etc.). Each sheet needs a header
   row with these columns (flexible naming):
   - **Player Name** (or "Name")
   - **Team** (NFL team, e.g. "BUF")
   - **Position** (e.g. "QB", "RB", "WR", "TE", "K", "DST")
   - **Ranking** (a number — lower is better)
2. **Import from MyFantasyLeague** — enter a league ID and season year and
   click Import. Works for any publicly-viewable MFL league, no credentials
   needed. Pulls franchises, rosters (including taxi squad / IR status,
   shown as a tag next to the player's name), the free-agent pool, and
   average draft position as a ranking proxy, via MFL's export API
   (`api.myfantasyleague.com/{year}/export?TYPE=...`).

Either way, then:

- **Pick which roster is yours** from the detected teams.
- **Browse**: your roster grouped by position, every other team's roster
  (collapsible), and a searchable/filterable available-players pool.

Without any upload or import, the site runs on a bundled sample league so
you can see the UI immediately.

### A note on the MFL import

MFL's response shapes (especially `freeAgents` and `adp`) are handled
defensively (recursively finding player entries rather than assuming one
exact nesting) because this couldn't be tested against a live league from
the environment this was built in — outbound network access there is
locked down to a small allowlist that doesn't include myfantasyleague.com.
The `league`/franchise parsing *was* verified against a real response. If
an import fails or looks wrong once deployed, share the error and — if you
can — the raw JSON from the failing endpoint (e.g.
`https://www49.myfantasyleague.com/2026/export?TYPE=freeAgents&L=16637&JSON=1`,
using your league's actual `baseURL`) so the parser can be adjusted.

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
| `MFL_LEAGUE_ID` | No | Pre-fills the MFL import form's league ID. |
| `MFL_SEASON` | No | Pre-fills the MFL import form's season year. |

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
      mflImport.js          # MyFantasyLeague export API -> teams / available players
      store.js              # persistence + "my team" selection
    data/
      sample-league.json    # bundled demo league (no upload needed)
  public/
    index.html, styles.css, app.js   # static frontend, no build step
```

## Draft recommendations

Once your team is selected, a "Draft Recommendations" section shows:

- A depth-target summary per position — your current count vs. a rough
  target (for MFL imports, derived from the league's actual starter limits,
  roughly 2x the max starters at that position; for spreadsheet uploads, a
  generic default). Positions below target are flagged.
- For each below-target position, the best-ranked available players there.
- If nothing's below target, the best available players overall instead.

These targets are a heuristic for "how thin are you here", not your
league's actual bench/roster rules.

## Roadmap

- **Weekly lineup recommendations** — suggest who to start, factoring in
  each player's current injury/health status and their opponent's matchup
  difficulty for the week. This needs two data sources not pulled in today:
  live injury status (MFL likely has this, e.g. via a `TYPE=injuries`
  export — not yet wired in) and the weekly schedule/matchups — to be
  investigated when we get there.
