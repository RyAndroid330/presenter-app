# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Express (port 3000) + Vite dev server (port 5173) concurrently
npm start          # Express server only
npm run vite       # Vite dev server only
npm run build      # Production build → dist/
```

Dev: access the app at `http://localhost:5173`. Vite proxies `/api`, `/auth`, `/logout` to Express at `http://localhost:3000`.

## Architecture

**Stack:** Vue 3 + Vue Router frontend (Vite), Express 5 backend, sql.js (in-memory SQLite with file sync), Google OAuth via Passport.js, SSE for real-time presenter→viewer broadcast.

### Backend (`server.js` + `db.js`)

- Express runs on port 3000; serves `dist/` in production.
- Database uses `sql.js` (WebAssembly SQLite) — entirely in-memory, synced to `presenter.db` on every write via `db.persist()`. There is no connection pool; every `db.run()` call ends with a file write.
- `db.js` exports: `init()` (async, must be awaited before server starts), `queryAll`, `queryOne`, `run`, `transaction`.
- `songxml.js` handles a parallel file-based song library in `/songs/<lang>/<filename>.xml` — separate from the SQLite songs table. Songs can be imported from XML into the DB via `POST /api/song-library/import`.

### Real-Time (SSE)

Live meeting state lives entirely in-memory in `liveMeetings[name]` on the server:
```js
{ text, chords, qr, clients: Response[], timer, timerEnd, timerTemplate }
```
- `GET /api/events?meet=<name>` — viewer opens SSE connection, added to `clients[]`.
- `POST /api/presenter?meet=<name>` — presenter broadcasts `{ text, chords, qr }` to all clients.
- Timer: if text matches `"in 2:30 minutes"` or `"in 45 seconds"`, server auto-ticks a countdown and pushes updates every second until the timer expires.

### Auth Flow

Google OAuth 2.0 via Passport. Session stored server-side (`express-session`). Protected routes check `req.isAuthenticated()`. After callback, dev redirects to `http://localhost:5173`, production redirects to `/`.

Env vars required: `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Optional: `GOOGLE_CALLBACK_URL` (defaults to `/auth/google/callback`, Express constructs the full URL from the request host).

Google Cloud Console must have `http://localhost:3000/auth/google/callback` registered as an authorized redirect URI for local dev.

### Frontend (`src/`)

- `main.js` → Vue app + router → `App.vue` (navbar shell)
- Router guards fetch `/api/user` before entering any protected route; unauthenticated users are redirected home.
- `useFitText.js` — binary-search composable that finds the largest font size fitting a container; used in ViewerView for fullscreen text.
- `useLanguagePref.js` — localStorage-backed language preference; maps ISO 639-1 ↔ ISO 639-3 for the Bible API.

### Data Models

**Songs (DB):** `songs` + `song_sections` tables. Sections have `chords` stored as JSON string `{ charIndex: "C" }` mapping character positions to chord names.

**Setlists:** `setlists` + `setlist_songs`. Has `owner` (Google email), `sharedToSlides` (boolean int) for public display.

**Lessons:** `lessons` + `lesson_slides`. Has `owner`, `sharedWith` (JSON array of emails), `sharedToSlides`.

**XML Song Format:**
```
[V1]
. G    C    D
 Lyric text here
[C1]
 Chorus without chords
```
Lines starting with `.` are chord lines; chord positions align with lyric character indices below.

### Key Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/user` | Auth check — returns user or 401 |
| GET/POST | `/api/songs` | List / create songs |
| PUT | `/api/songs/:id/sections` | Replace all sections (also writes XML) |
| GET/POST | `/api/setlists` | List / create setlists |
| POST | `/api/setlists/:id/share` | Mark setlist visible to presenter |
| GET/POST | `/api/lessons` | List / create lessons |
| POST | `/api/lessons/:id/share` | Update `sharedWith` + `sharedToSlides` |
| GET | `/api/events?meet=` | Open SSE stream (viewer) |
| POST | `/api/presenter?meet=` | Broadcast to viewers |
| GET | `/api/song-library/:lang/:filename` | Read XML song file |
| POST | `/api/song-library/import` | Import XML song into DB |
| GET | `/api/bible/text` | Fetch Bible verses (external Bible DB) |
