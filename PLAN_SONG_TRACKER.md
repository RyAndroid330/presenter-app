# Plan: Song Tracker Feature

## Goal
Extend the AI Meeting Assistant to identify worship songs from sung lyrics and verbal
callouts, then track section navigation automatically during a live set.

---

## Phase 1 — Song Identification

### 1a. New server endpoint: `POST /api/assistant/identify-song`
- Input: `{ transcript, meetingName }`
- Runs `parseBibleRef()` first — if it's a Bible ref, skip song matching
- Searches the song library (DB `songs` table + XML library) for a match:
  - Build a keyword index: for each song, extract first line of each section
  - Fuzzy-match transcript words against: song title + first lines of all sections
  - Score by word overlap; return top match above threshold (0.6)
- Returns `{ matched: bool, song: { id, title, sections[] } }` or `{ matched: false }`
- Also checks for verbal navigation callouts (see Phase 2)

### 1b. Song index builder (server-side, built once on startup)
```
songIndex = [
  { id, title, keywords: ["take my life", "holiness", "faithfulness", ...] }
]
```
- `keywords` = song title words + first line of every section (lowercased, stripped)
- Rebuilt when songs are added/edited (or just on server start)
- Lives in memory — no DB changes needed

### 1c. Frontend: song mode panel in AssistantView
- When a song is matched, show a confirmation card:
  - Song title + first section preview
  - **Confirm** button (loads song into tracker) and **Dismiss** button
- Operator always confirms before the song tracker activates
- Once confirmed: song section panel appears (see Phase 2)

---

## Phase 2 — Section Navigation via Verbal Callouts

### 2a. Section keyword index (per active song)
When a song is confirmed, build a local map:
```js
sectionKeywords = [
  { sectionIndex: 0, type: 'verse', keywords: ['take my life', 'let it be'] },
  { sectionIndex: 1, type: 'chorus', keywords: ['holiness', 'take my life and let it be'] },
  { sectionIndex: 2, type: 'verse', keywords: ['faithfulness', 'faithfulness is what i need'] },
]
```
Keywords sourced from: section `type` name + first line of section `text`.

### 2b. Callout detection (client-side, in existing speech loop)
When a song is active, before sending to `/api/ai-assistant`, run local callout check:
- Match transcript words against `sectionKeywords`
- Also match navigation phrases: "chorus", "verse", "bridge", "one more time",
  "from the top", "last time", "take it home", "again"
- On match above threshold: advance to that section immediately (no server round-trip)
- On "one more time" / "again": re-display current section
- On "from the top": jump to section 0

### 2c. Section display panel in AssistantView
Shown when a song is active:
- All sections listed vertically, current one highlighted
- Tap any section to jump manually (operator override always available)
- Prev / Next buttons for manual advance
- "Exit song mode" button to return to Bible/general mode
- Each section shows: type badge (V1, C, B) + first line of text

### 2d. Broadcast behaviour
When section advances (by callout or manual):
- Broadcast the section's full `text` to the meeting via SSE (same as Bible verses)
- Chord data from `section.chords` also broadcast so musician view updates
- `POST /api/presenter?meet=<name>` with `{ text, chords }` — reuses existing infrastructure

---

## Phase 3 — Setlist Integration (optional, after Phase 2 is stable)

- Load a full setlist into the assistant
- Setlist panel shows all songs in order
- When a song ends (operator taps "done" or callout "next song"), advance to next song
  in the setlist and begin identification/tracking for it
- Setlist fetched from existing `/api/setlists/:id` endpoint

---

## Data flow summary

```
Mic → Web Speech API → transcript
  → parseBibleRef()        → Bible verse slide
  → identifySong()         → confirmation card → song tracker active
      → calloutDetect()    → section advance → SSE broadcast
  → manual tap             → section advance → SSE broadcast
```

---

## Files to change

| File | Change |
|------|--------|
| `server.js` | Add `POST /api/assistant/identify-song`, song index builder |
| `src/views/AssistantView.vue` | Song confirmation card, section panel, callout detection |

No DB schema changes required.
