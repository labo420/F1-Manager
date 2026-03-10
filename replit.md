# Fantasy F1 League

## Overview
Private Fantasy F1 web application. Users register (username + password), create or join lobbies (max 10 players), pick a driver and constructor per Grand Prix, and earn points based on FIA scoring + overtakes + fastest lap bonuses. Includes a public F1 2026 World Championship section with official standings, race archive, and circuit details.

## Architecture
- **Backend**: Express.js (TypeScript) + SQLite via Drizzle ORM (better-sqlite3)
- **Frontend**: React (Vite) + TanStack Query + Wouter routing + Tailwind CSS + shadcn/ui + Framer Motion
- **Session**: express-session with better-sqlite3-session-store (stored in SQLite)
- **Database File**: `database/fantaf1.db` (auto-created on first startup with all tables)
- **Portability**: Download ZIP → Extract → `npm install` → `npm run dev` → Works

## Key Files
| File | Purpose |
|---|---|
| `shared/schema.ts` | Drizzle SQLite tables (users, lobbies, lobbyMembers, drivers, constructors, races, selections, driverResults, constructorResults, draftState), insert schemas, TS types |
| `server/db.ts` | SQLite connection (better-sqlite3), auto-creates all tables on startup |
| `server/routes.ts` | Express route handlers, seed data, middleware, auto-lock logic, ITA time conversion |
| `server/storage.ts` | `IStorage` interface + `DatabaseStorage` class with lobby-scoped methods |
| `drizzle.config.ts` | Drizzle Kit config for SQLite dialect |
| `client/src/App.tsx` | Router with `ProtectedRoute` guards |
| `client/src/pages/Auth.tsx` | Login/Register page |
| `client/src/pages/Dashboard.tsx` | Lobby selection + race accordion homepage (Coming Soon / In Corso / Risultati) |
| `client/src/pages/Paddock.tsx` | Central league hub: Make Picks (draft), Spy Opponents, Standings |
| `client/src/pages/Admin.tsx` | Admin Race Control + bulk results entry + members list |
| `client/src/pages/Leaderboard.tsx` | Per-lobby dual standings (driver/constructor toggle) |
| `client/src/pages/Profile.tsx` | Avatar upload, league memberships overview |
| `client/src/pages/F1Season.tsx` | Public F1 2026 season page (standings, archive, circuit details) |
| `client/src/components/Navigation.tsx` | Top nav + mobile bottom dock + back button + Paddock link |
| `client/src/hooks/use-auth.ts` | Auth hook (login, register, logout, current user + memberships) |
| `client/src/hooks/use-lobby.ts` | Active lobby state, create/join/switch lobby, set team name |
| `client/src/hooks/use-selections.ts` | Lobby-scoped selections, draft status, usage info |
| `client/src/hooks/use-leaderboard.ts` | Dual driver/constructor leaderboard hooks |

## Database (SQLite)
- All data stored in `database/fantaf1.db` (local file)
- Tables auto-created via raw SQL in `server/db.ts` on first startup
- WAL mode enabled for better concurrent read performance
- Foreign keys enforced
- Dates stored as ISO 8601 text strings
- Booleans stored as integers (0/1) with Drizzle `mode: "boolean"` mapping

## Multi-Lobby System
- **lobbyMembers** junction table: userId, lobbyId, teamName, driverJokers, constructorJokers, jokerCount (legacy), role, createdAt
- Users can belong to multiple lobbies with different roles per lobby
- Active lobby stored in `localStorage` key `f1-active-lobby-id` via `useActiveLobby()` hook
- `/api/me` returns `{ ...user, memberships: Membership[] }` where each membership has lobbyId, lobbyName, lobbyCode, teamName, driverJokers, constructorJokers, jokerCount, role
- Admin check: `memberships.some(m => m.role === "admin")` for any lobby
- selections, draft state, usage, leaderboards are all lobby-scoped

## Split Star-Based Joker System (Logic 7)
- Two separate star pools per user per lobby: `driverJokers` (4) and `constructorJokers` (4)
- Stars displayed as filled/empty ★ icons instead of "Joker" text
- When a user picks a driver/constructor for the 3rd time, a star is consumed from the respective pool
- Server validates each pool independently (driver picks use driver stars, constructor picks use constructor stars)
- `UsageInfo` type has `driverJokersRemaining` and `constructorJokersRemaining` fields
- Storage methods: `consumeDriverJoker()`, `consumeConstructorJoker()`

## Race Accordion Homepage (Logic 8)
- Dashboard (`/`) shows all 24 races in an accordion layout
- Each race has auto-detected status based on ITA time:
  - **Coming Soon**: Default state before race start
  - **In Corso**: From race start time until admin marks completed
  - **Risultati**: Once race is completed
- Post-race accordion shows:
  - Real Podium: Driver initials + points (e.g., CL 16 → CL)
  - Fantasy Winners: Best driver pick and best constructor pick per lobby
- API: `GET /api/lobby/:lobbyId/race/:raceId/fantasy-winners`

## Paddock Section (Logic 9)
- Route: `/paddock` with "Paddock" nav item
- Central hub for all league management
- Three tabs:
  - **Make Picks**: Full draft/pick interface (moved from old Dashboard)
  - **Spy Opponents**: View locked picks from other players
  - **Standings**: Dual driver/constructor leaderboard
- API: `GET /api/lobby/:lobbyId/race/:raceId/picks` (only visible when race is locked or completed)

## RBAC Model
- **Admin**: User who creates a lobby (automatically gets `role: "admin"` in lobbyMembers).
  - Can lock/unlock races, mark completed, enter bulk driver results, view lobby members.
- **Player**: User who joins a lobby via invite code (gets `role: "player"`).
  - Can pick driver + constructor per race, view leaderboard.

## Lobby System
- Invite codes: `F1-XXXX` format (7 chars, uppercase alphanumeric).
- Max 10 players per lobby.
- `teamName` defaults to `"TBD"` — user must set a scuderia name after entering lobby.
- Dashboard shows "Leagues I Manage" / "Leagues I Joined" or create/join buttons.

## Race Timing
- `itaTime` column stores Italian local time (e.g., "15:00")
- `getUtcFromItaTime()` converts ITA time to UTC considering CET/CEST offset
- Race lock check: 1 hour before race `date` (UTC)
- ITA_RACE_TIMES map assigns correct time per round number

## F1 2026 Public Section
- Route: `/f1-2026` (accessible to all logged-in users, no lobby required)
- **Driver Standings**: All 20 drivers with team color bars, positions, wins, podiums, points (from `/api/f1/driver-standings`)
- **Constructor Standings**: All 10 constructors with team colors, sorted by points (from `/api/f1/constructor-standings`)
- **Race Archive**: 24-race calendar with expandable cards showing:
  - **Circuit Info**: Circuit name, length (km), lap count, total distance
  - **Race Results Tab**: Driver positions, points, times, gaps, fastest lap (from `/api/f1/race/:id/external-results` — Jolpica API)
  - **Qualifying Tab**: Grid order with Q1/Q2/Q3 times and gaps (from `/api/f1/race/:id/qualifying` — Jolpica API)
  - **Sprint Tab**: Sprint results with points and gaps (if circuit has sprint format) (from `/api/f1/race/:id/sprint` — Jolpica API)
- All race data sourced from free **Jolpica API** (Ergast F1 API wrapper)

## Dual Leaderboards
- Per-lobby driver standings: FIA points + overtakes + fastest lap bonus from picked drivers
- Per-lobby constructor standings: constructor points from picked constructors
- Toggle between them on the Leaderboard page and in Paddock Standings tab

## Avatars
- Upload via `POST /api/user/avatar` (multer, max 2MB, JPG/PNG/WEBP)
- Stored in `uploads/avatars/` (relative path)
- Displayed in nav, leaderboard, draft order, profile

## Auto-Lock Logic
- When fetching race list (`GET /api/races`), server checks each race: if less than 1 hour before race start and not yet locked, it auto-locks the race
- Selection upsert endpoint also checks the 1-hour threshold and rejects picks
- Admin can still manually lock/unlock races

## Admin Bulk Results
- Route: `/admin` with bulk results table for all 20 drivers
- Auto-fills FIA points based on position (P1=25, P2=18, P3=15, etc.)
- Only one driver can have fastest lap (radio-style checkbox behavior)
- `POST /api/admin/race/:id/bulk-results` auto-computes constructor standings from driver team assignments
- Marks race as locked + completed automatically on save

## Scoring
- Driver: FIA points + 1 per overtake + 2 for fastest lap
- Constructor: FIA points (aggregated from driver results by team)

## Draft System (Sequential Turn-Based Picks)
- Per-lobby, per-race sequential drafting: only one player can pick at a time.
- Draft order based on reverse league standings (lowest total points picks first). First race: reverse registration timestamp.
- Turn enforcement with atomic advance using conditional WHERE clause.
- Draft status polled every 5 seconds on frontend.

## Usage Limits & Stars (Wildcards)
- Each driver/constructor can be selected max 2 times per season for free.
- 3rd selection requires a Star (auto-consumed from respective pool). Hard-blocked at 4th selection (max 3).
- Users start with 4 Driver Stars + 4 Constructor Stars per lobby.
- Server validates usage counts and handles star delta on edit, per pool.

## Seed Data
- 20 drivers, 10 constructors with hex colors, 24 races from CSV
- `parseCalendarCSV()` parses semicolon-delimited CSV with ITA time mapping
- Seed is idempotent (checks for existing data, circuit info, itaTime)

## Important Notes
- Passwords stored in plaintext (no hashing).
- Case-insensitive username lookup in storage layer.
- All file paths are relative for portability.

## Environment
- `SESSION_SECRET` — Session signing secret (set via env var)
- `PORT` — Server port (defaults to 5000)
- Dev server: `npm run dev` (Express + Vite on port 5000)

## Deployment (Render / Railway / Local)
- **Build command**: `npm install && npm run build`
- **Start command**: `npm run start`
- **Build output**: `dist/index.cjs` (server) + `dist/public/` (client static files)
- **Native modules**: `better-sqlite3` is kept external during esbuild bundling (C++ addon)
- **Replit plugins**: Conditionally loaded only when `REPL_ID` env var is present — no impact on external deployments
- **Database**: Auto-created at `database/fantaf1.db` on first startup
- **Seed data**: Reads from `attached_assets/` CSV — must be in the deployed repo
- **Uploads**: Stored in `uploads/avatars/` relative to CWD
- **Environment variables**: Set `SESSION_SECRET` and optionally `PORT` on host platform
