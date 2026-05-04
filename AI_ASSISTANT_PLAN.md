# AI Meeting Assistant — Implementation Plan

## Goal
New `/assistant` page with voice-command control. Listens for spoken Bible references
("turn to John 3:31"), calls Groq to parse intent, fetches verse from local `bible.db`,
and broadcasts the slide text to the active meeting via SSE.

## Model
`llama-3.3-70b-versatile` — best reasoning + speed on Groq for structured extraction.

---

## Steps

### Step 1 — Backend: book-search endpoint
`GET /api/bible/book-search?translation=<id>&name=<spoken name>`  
Returns the best-matching Book row so spoken names like "John", "First John",
"Revelation" resolve to a DB book ID.

### Step 2 — Backend: AI assistant endpoint
`POST /api/ai-assistant`  
Body: `{ transcript, translationId, meetingName }`  
- Calls Groq with the transcript → JSON `{ hasBibleRef, book, chapter, verse, endVerse }`
- Resolves book → DB ID via book-search logic
- Fetches verse text from `bibledb.getVerses()`
- Formats slide: `"John 3:31\n<verse text>"`
- Broadcasts to the meeting's SSE clients
- Returns `{ slideText, reference, verses }`

### Step 3 — Frontend: AssistantView.vue
Layout:
- Top bar: meeting selector + enable/disable listening toggle
- Left panel: Bible version selector (language → translation dropdowns)
- Center: current slide preview (mirrors what was broadcast)
- Bottom: live transcript display + status indicator (listening / processing / idle)

Voice: Web Speech API (`SpeechRecognition`), continuous mode, interim results shown,
final result sent to `/api/ai-assistant`.

### Step 4 — Router + Navbar
- Add `{ path: '/assistant', component: AssistantView }` (auth-protected)
- Add "Assistant" nav button in `App.vue`

---

## Key constraints
- Groq env var: `GroqLAYER_API_KEY` (existing key in .env)
- Bible DB: `archive/bible.db` via `archive/bibledb.js` (already loaded in server.js)
- Broadcast reuses existing `liveMeetings` SSE infrastructure
- Book name matching: case-insensitive substring on `commonName` then `name`
