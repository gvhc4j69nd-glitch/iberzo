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
| `DATABASE_URL` | No | Postgres connection string — see below. |
| `PGSSLMODE` | No | Set to `disable` for a non-SSL local Postgres; leave unset for Railway's managed Postgres. |

## Data & persistence

**With `DATABASE_URL` set** (e.g. on Railway with a Postgres service
attached): league data is stored in a single `league_state` table (one
JSONB row), created automatically on startup if it doesn't exist. This
survives redeploys and restarts — no re-importing needed.

**Without it** (e.g. local dev): data is written to
`server/data/league.json` (gitignored) instead, which only survives a
plain restart, not a fresh deploy/checkout.

Either way, uploading a new spreadsheet or re-running an MFL import
replaces the stored league entirely and clears the "which roster is
mine" selection, since team names may have changed.

### Connecting to Railway's Postgres

If you've added a Postgres database in Railway within the same project as
this app: open the app service's **Variables** tab and confirm it has a
`DATABASE_URL`. If it's not there yet, add a new variable and reference
the Postgres service's `DATABASE_URL` (Railway's variable picker lets you
select another service's variable rather than typing a value) — don't
paste the raw connection string in by hand if you can avoid it.

## Project layout

```
fantasy-manager/
  server/
    index.js              # Express app entrypoint
    routes/league.js       # GET /api/league, POST /api/upload, POST /api/league/my-team
    lib/
      parseSpreadsheet.js  # multi-sheet .xlsx -> teams / available players
      mflImport.js          # MyFantasyLeague export API -> teams / available players
      mflClient.js           # shared MFL fetch/parsing helpers
      mflInjuries.js         # shared injury-report fetch (used by import + weekly check)
      mflWeekly.js           # live per-week injury/schedule fetch
      db.js                  # Postgres connection + schema
      store.js              # persistence (Postgres or file) + "my team" selection
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
- **Best Draft Order** — the top 50 available players ranked purely by
  ADP/ranking (a single cross-position list, since that's what ADP is
  for), with a "Need" tag on positions below your depth target.
- Per-position breakdowns of the best-ranked available players at each
  below-target position, or the best available overall if nothing's short.

These targets are a heuristic for "how thin are you here", not your
league's actual bench/roster rules.

## Bye weeks on every roster

Every player row also shows their team's bye week for the season (e.g.
"DAL (Bye 14)"), pulled once via MFL's dedicated `TYPE=nflByeWeeks`
export during import/Update — no per-week lookup needed, since bye weeks
don't change during the season.

## Injury status on every roster

Every player row (My Roster, League Rosters, Available Players) shows a
current injury badge (Questionable, Out, IR, etc., straight from MFL's
injury report) when one exists, plus an "Injury info" link for more
detail — ESPN's player page when MFL has an `espn_id` for that player,
otherwise a plain Google search for "{player} NFL injury" as a fallback
that always resolves to something useful.

## Keeping data current — no local roster editing

MFL is the source of truth for this league: the live draft happens in
MFL's draft room, and roster moves happen through MFL's real waiver
system. This app deliberately does **not** let you edit rosters locally
(drop/add players, manually mark draft picks) — that would create a
second, divergent version of "the truth" and require re-entering every
real transaction by hand. Instead, an **Update** button appears next to
Import once a league's been imported from MFL — it re-fetches everything
(rosters, free agents, rankings) using the same league ID/season, without
needing to re-enter them, and preserves your team selection if that team
still exists in the refreshed data.

## Weekly lineup check

For MFL-imported leagues, once your team is picked, a "Weekly Lineup
Check" box lets you enter a week number and fetches — fresh, every time,
never cached — that week's injury report and NFL schedule from MFL. Your
roster is grouped by position with:

- **Start/Bench** — the best-ranked healthy players fill your league's
  actual starter slots per position; anyone Out, on IR, Retired, or on a
  bye is automatically benched (Questionable/Doubtful players are flagged
  but still eligible, since they're not confirmed out).
- **Opponent** for the week (or BYE), plus the opponent's pass/rush
  defense rank when MFL has published it (usually empty before the season
  starts or before enough games have been played for a rank to exist —
  shown only when present, with no claim about which direction is
  favorable, since that wasn't verified against real in-season data).
- **Injury status**, straight from MFL's injury report.

## Roadmap

- Real matchup-*difficulty* scoring (translating the defense-rank numbers
  above into an actual "good/bad matchup" signal) once there's live
  in-season data to calibrate against.
