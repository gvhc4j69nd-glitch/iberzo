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
| **murdrclub** | Community site for the world's top unsolved murders, organized by region — join the hunt on a case, contribute evidence, rate other members' contributions, chat, regional admin approval |

## Preferences

## Active Project: murdrclub

### Stack
- Frontend: React + Vite + react-router-dom
- Backend: Node.js + Express + Socket.io
- Database: SQLite (better-sqlite3)
- Auth: JWT + bcrypt

### Architecture
```
murdrclub/
  client/       # React + Vite
    src/pages/       # Home, Login/Register, Regions, RegionDetail, CaseDetail,
                      # SubmitCase, Members, MemberProfile, Messages, Admin
  server/       # Node/Express/Socket.io
    db/         # SQLite database, 20 seeded regions
    routes/     # auth, regions, cases, contributions, members, chat, admin
```

### Key Features
1. Registration/login, public member directory & rankings
2. 20 regions (5 US regions + 15 international); top unsolved murders ranked per region
3. Suggest a case → pending until a regional admin approves it
4. Join the hunt on a case; contribute text/link/photo/video evidence
5. Members rate each other's contributions 1-5; drives the member leaderboard
6. Real-time chat: 1:1 DMs and per-case group chat (Socket.io)
7. Superadmin assigns regional admins, who approve/reject case submissions for their region

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
