# Plan: Live CC Translation Feature

## Goal
Every slide broadcast to viewers can be translated in real time. Each viewer selects
their preferred language and sees a translated version of the current slide text.
Requires Groq API working (llama-3.1-8b-instant for speed).

---

## Architecture

```
Presenter broadcasts text
  → Server translates into only the languages viewers are currently watching
  → Each viewer's SSE stream carries text in their selected language
```

Key constraint: translate once per active language, not once per viewer.
If 5 Spanish viewers are connected, one Groq call serves all 5.

---

## Phase 1 — Server: language-aware SSE

### 1a. Update SSE client storage
Change `liveMeetings[name].clients` from `Response[]` to:
```js
clients: [{ res: Response, lang: string | null }]
```
`lang: null` means original language (no translation).

### 1b. Update `GET /api/events`
Accept optional `?lang=es` query param alongside `?meet=name`.
Store `{ res, lang }` in clients array.

### 1c. Update broadcast logic in `POST /api/presenter` and `/api/ai-assistant`
When broadcasting:
1. Collect the set of unique non-null languages from connected clients
2. For each unique language, call Groq once to translate:
   ```
   POST /openai/v1/chat/completions
   model: llama-3.1-8b-instant   ← fastest, cheapest, translation is easy
   prompt: "Translate to <lang>. Return only the translation, no explanation: <text>"
   ```
3. Send each client their language version (or original if lang is null)
4. Cache translations for 30 seconds keyed by `hash(text)+lang` to avoid
   re-translating the same slide if multiple people join mid-presentation

### 1d. New helper: `translateText(text, targetLang)`
Async function wrapping the Groq call with the 30s cache.
Returns translated string. Falls back to original on error (never breaks the broadcast).

---

## Phase 2 — Viewer: language selector

### 2a. Update ViewerView.vue
- Add a small language selector button (globe icon, bottom-left corner)
- On click: open a compact language picker overlay
- Language list: a curated short list of ~20 common languages (not the full Bible list)
  stored as a constant in the component
- Selected language stored in `localStorage` so it persists across page loads

### 2b. SSE reconnect with language param
When viewer selects a language:
- Close current EventSource
- Reopen: `/api/events?meet=<name>&lang=<code>`
- The `connectSSE()` function already handles reconnection — just pass the lang param

### 2c. CC display in ViewerView
- Add a small "CC" badge in the corner when translation is active
- The translated text replaces the main display text (it's already the text from SSE)
- No layout changes needed — SSE sends the translated text directly

---

## Phase 3 — AssistantView: translation preview

- Show a "Translations active" indicator listing current viewer languages
- e.g. "🌐 3 viewers: es, fr, de"
- Fetched from a new `GET /api/meeting-langs?meet=<name>` endpoint that returns
  the current language set of connected clients

---

## Groq usage profile

| Per broadcast | ~1 Groq call per unique language |
| Model | `llama-3.1-8b-instant` (lowest latency, sufficient for translation) |
| Latency | ~200–400ms — viewers see translation ~0.5s after presenter fires |
| Cost | Minimal — short prompts, instant model |
| Failure mode | Falls back to original language silently |

---

## Files to change

| File | Change |
|------|--------|
| `server.js` | Language-aware client storage, `translateText()`, updated broadcast |
| `src/views/ViewerView.vue` | Language selector, SSE lang param, CC badge |
| `src/views/AssistantView.vue` | Active language indicator panel |

No DB schema changes required.

---

## Dependency
Groq API must be working before this phase starts.
The song tracker (PLAN_SONG_TRACKER.md) should be complete and stable first.
