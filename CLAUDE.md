# Memory

## Me
Joe Peffer, solo founder/operator — leader and only person on the team.

## People
| Who | Role |
|-----|------|

## Terms
| Term | Meaning |
|------|---------|

## Projects
| Name | What |
|------|------|
| **Azul Game** | Multiplayer online Azul (tile-drafting board game) with registration and leaderboards |

## Preferences

## Active Project: Azul Game

### Stack
- Frontend: React + Vite
- Backend: Node.js + Express + Socket.io
- Database: SQLite (better-sqlite3)
- Auth: JWT + bcrypt

### Architecture
```
azul-game/
  client/       # React + Vite
  server/       # Node/Express/Socket.io
    db/         # SQLite database
    routes/     # auth, leaderboard
    game/       # Azul game engine
```

### Key Features
1. User registration & login
2. Game lobby (create/join rooms)
3. Azul game engine + real-time sync
4. Leaderboard (win/loss or ELO)

### Blocked On
- Node.js not installed → `brew install node` or nodejs.org LTS
