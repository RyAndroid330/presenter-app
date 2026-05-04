<template>
  <div class="assistant-root">
    <!-- ── Top bar ── -->
    <div class="assistant-toolbar">
      <div class="toolbar-group">
        <label class="toolbar-label">Meeting</label>
        <select v-model="selectedMeeting" class="toolbar-select">
          <option value="">— none —</option>
          <option v-for="m in meetings" :key="m.id" :value="m.name">{{ m.name }}</option>
        </select>
      </div>

      <div class="toolbar-group">
        <label class="toolbar-label">Bible Language</label>
        <select v-model="selectedLang" @change="onLangChange" class="toolbar-select">
          <option value="">— select —</option>
          <option v-for="l in languages" :key="l.code" :value="l.code">{{ l.name }}</option>
        </select>
      </div>

      <div class="toolbar-group">
        <label class="toolbar-label">Bible Version</label>
        <select v-model="selectedTranslation" class="toolbar-select" :disabled="!translations.length">
          <option value="">— select —</option>
          <option v-for="t in translations" :key="t.id" :value="t.id">{{ t.shortName || t.englishName }}</option>
        </select>
      </div>

      <button
        class="listen-btn"
        :class="{ listening: isListening }"
        :disabled="!canListen"
        :title="!selectedMeeting ? 'Select a meeting first' : ''"
        @click="toggleListening"
      >
        <span class="material-icons">{{ isListening ? 'mic' : 'mic_off' }}</span>
        {{ isListening ? 'Listening…' : 'Start Listening' }}
      </button>
    </div>

    <!-- ── Main area ── -->
    <div class="assistant-body">

      <!-- Slide preview -->
      <div class="slide-preview-panel">
        <div class="panel-title">Current Slide</div>
        <div class="slide-preview" :class="{ empty: !currentSlide }">
          <span v-if="!currentSlide" class="slide-empty-hint">Broadcast will appear here</span>
          <pre v-else class="slide-text">{{ currentSlide }}</pre>
        </div>
      </div>

      <!-- Song section panel — shown when a song is active -->
      <div v-if="activeSong" class="section-panel">
        <div class="section-panel-header">
          <div>
            <div class="panel-title">Now Tracking</div>
            <div class="song-title">{{ activeSong.title }}</div>
          </div>
          <button class="exit-song-btn" @click="exitSongMode" title="Exit song mode">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="section-list">
          <div
            v-for="(sec, i) in activeSong.sections"
            :key="i"
            class="section-item"
            :class="{ active: i === activeSectionIndex, sending: i === broadcastingIndex }"
            @click="setSection(i)"
          >
            <span class="section-badge" :class="sec.type">{{ sectionLabel(sec, i) }}</span>
            <span class="section-preview">{{ firstLine(sec.text) }}</span>
          </div>
        </div>

        <div class="section-nav">
          <button class="nav-btn-sec" :disabled="activeSectionIndex <= 0" @click="prevSection">
            <span class="material-icons">arrow_upward</span>
          </button>
          <span class="section-counter">{{ activeSectionIndex + 1 }} / {{ activeSong.sections.length }}</span>
          <button class="nav-btn-sec" :disabled="activeSectionIndex >= activeSong.sections.length - 1" @click="nextSection">
            <span class="material-icons">arrow_downward</span>
          </button>
        </div>
      </div>

      <!-- Voice + status panel -->
      <div class="voice-panel">
        <div class="panel-title">Voice Input</div>

        <!-- Song match candidates -->
        <div v-if="pendingSongs.length" class="song-candidates">
          <div class="song-candidates-header">
            <span class="material-icons" style="font-size:16px;color:var(--accent)">music_note</span>
            {{ pendingSongs.length === 1 ? 'Song detected' : `${pendingSongs.length} matches — pick one` }}
            <button class="dismiss-all-btn" @click="pendingSongs = []" title="Dismiss">
              <span class="material-icons" style="font-size:16px">close</span>
            </button>
          </div>
          <div
            v-for="song in pendingSongs"
            :key="song.id"
            class="song-candidate-item"
            @click="confirmSong(song)"
          >
            <div class="candidate-info">
              <div class="candidate-title">{{ song.title }}</div>
              <div class="candidate-preview">{{ firstLine(song.sections?.[0]?.text) }}</div>
            </div>
            <span class="material-icons candidate-arrow">chevron_right</span>
          </div>
        </div>

        <div class="status-row">
          <span class="status-dot" :class="statusClass"></span>
          <span class="status-label">{{ statusLabel }}</span>
        </div>

        <div class="transcript-box">
          <p v-if="interimTranscript" class="interim">{{ interimTranscript }}</p>
          <p v-if="!interimTranscript && !lastFinal" class="transcript-hint">
            {{ activeSong ? 'Say a section name, "chorus", "verse 2", etc.' : 'Say a Bible ref or start singing a song' }}
          </p>
          <p v-if="lastFinal" class="final">{{ lastFinal }}</p>
        </div>

        <div v-if="lastResult" class="result-card" :class="lastResult.handled ? 'success' : 'miss'">
          <span class="material-icons result-icon">{{ lastResult.handled ? 'check_circle' : 'info' }}</span>
          <span>{{ lastResult.handled ? lastResult.reference : lastResult.message }}</span>
        </div>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

        <!-- History -->
        <div v-if="history.length" class="history">
          <div class="panel-title" style="margin-top:16px">History</div>
          <div v-for="(h, i) in history" :key="i" class="history-item">
            <span class="history-ref">{{ h.reference }}</span>
            <button class="history-rebroadcast" @click="rebroadcast(h)" title="Re-send">
              <span class="material-icons" style="font-size:16px">replay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

/* ── State ── */
const meetings = ref([])
const selectedMeeting = ref('')
const languages = ref([])
const selectedLang = ref('eng')
const translations = ref([])
const selectedTranslation = ref('')

const isListening = ref(false)
const status = ref('idle')
const interimTranscript = ref('')
const lastFinal = ref('')
const lastResult = ref(null)
const errorMsg = ref('')
const currentSlide = ref('')
const history = ref([])
const lastVerseRef = ref(null) // { book, chapter, verse, endVerse } from last successful Bible fetch

const NEXT_VERSE_PHRASES = new Set(['next verse', 'next passage', 'continue', 'read on', 'next one'])

// Song tracking state
const pendingSongs = ref([])       // matched candidates awaiting operator confirmation
const activeSong = ref(null)       // confirmed and being tracked
const activeSectionIndex = ref(0)
const broadcastingIndex = ref(-1)  // briefly set on broadcast for visual feedback

/* ── Callout keywords ── */
const NAV_KEYWORDS = {
  'from the top': 0, 'verse one': 0, 'verse 1': 0, 'first verse': 0,
  'one more time': -1,  // -1 = repeat current
  'again': -1,
  'chorus': 'chorus', 'bridge': 'bridge', 'outro': 'outro', 'pre-chorus': 'pre-chorus',
  'verse two': 1, 'verse 2': 1, 'second verse': 1,
  'verse three': 2, 'verse 3': 2, 'third verse': 2,
  'verse four': 3, 'verse 4': 3, 'fourth verse': 3,
  'last time': 'last', 'take it home': 'last',
}

/* ── Derived ── */
const canListen = computed(() => !!selectedMeeting.value && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window))

const statusClass = computed(() => ({
  dot_idle: status.value === 'idle',
  dot_listening: status.value === 'listening',
  dot_processing: status.value === 'processing',
  dot_error: status.value === 'error',
}))

const statusLabel = computed(() => ({
  idle: 'Idle — press Start Listening',
  listening: activeSong.value ? `Tracking: ${activeSong.value.title}` : 'Listening for commands…',
  processing: 'Processing…',
  error: 'Error — see below',
}[status.value] || 'Idle'))

/* ── Helpers ── */
function firstLine(text) {
  return (text || '').split('\n').find(l => l.trim()) || ''
}

function sectionLabel(sec, i) {
  const typeMap = { verse: 'V', chorus: 'C', bridge: 'B', intro: 'I', outro: 'O', 'pre-chorus': 'P' }
  const letter = typeMap[sec.type] || sec.type[0].toUpperCase()
  // Count same type before this index for numbering
  const sameType = activeSong.value.sections.slice(0, i + 1).filter(s => s.type === sec.type)
  return sameType.length > 1 ? `${letter}${sameType.length}` : letter
}

/* ── Data loading ── */
async function loadMeetings() {
  try { meetings.value = await fetch('/api/meetings').then(r => r.json()) } catch {}
}

async function loadLanguages() {
  try {
    const all = await fetch('/api/bible/languages').then(r => r.json())
    languages.value = [...all.filter(l => l.popular), ...all.filter(l => !l.popular)]
  } catch {}
}

async function onLangChange() {
  selectedTranslation.value = ''
  translations.value = []
  if (!selectedLang.value) return
  try {
    translations.value = await fetch(`/api/bible/translations?lang=${selectedLang.value}`).then(r => r.json())
    const preferred = translations.value.find(t => t.id === 'BSB') || translations.value.find(t => t.id === 'eng_asv')
    if (preferred) selectedTranslation.value = preferred.id
    else if (translations.value.length === 1) selectedTranslation.value = translations.value[0].id
  } catch {}
}

/* ── Song tracking ── */
function confirmSong(song) {
  activeSong.value = song
  activeSectionIndex.value = 0
  pendingSongs.value = []
  broadcastSection(0)
}

function exitSongMode() {
  activeSong.value = null
  activeSectionIndex.value = 0
  pendingSongs.value = []
}

function setSection(index) {
  activeSectionIndex.value = index
  broadcastSection(index)
}

function prevSection() {
  if (activeSectionIndex.value > 0) setSection(activeSectionIndex.value - 1)
}

function nextSection() {
  if (activeSectionIndex.value < activeSong.value.sections.length - 1)
    setSection(activeSectionIndex.value + 1)
}

async function broadcastSection(index) {
  if (!activeSong.value || !selectedMeeting.value) return
  const sec = activeSong.value.sections[index]
  if (!sec) return
  currentSlide.value = sec.text
  let chords = null
  try {
    chords = !sec.chords ? null
      : typeof sec.chords === 'string' ? JSON.parse(sec.chords)
      : sec.chords
  } catch {}
  broadcastingIndex.value = index
  try {
    await fetch('/api/assistant/broadcast-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingName: selectedMeeting.value,
        songTitle: activeSong.value.title,
        sectionIndex: index,
        text: sec.text,
        chords,
      }),
    })
  } catch {}
  setTimeout(() => { broadcastingIndex.value = -1 }, 600)
}

/* ── Callout detection (client-side, no server needed) ── */
function detectCallout(transcript) {
  if (!activeSong.value) return false
  const t = transcript.toLowerCase().trim()
  const sections = activeSong.value.sections

  // Check exact nav keywords first
  for (const [phrase, target] of Object.entries(NAV_KEYWORDS)) {
    if (t.includes(phrase)) {
      if (target === -1) {
        // Repeat current section
        broadcastSection(activeSectionIndex.value)
        return true
      }
      if (target === 'last') {
        setSection(sections.length - 1)
        return true
      }
      if (typeof target === 'number') {
        if (target < sections.length) { setSection(target); return true }
      }
      if (typeof target === 'string') {
        // Find first section of that type
        const idx = sections.findIndex(s => s.type === target)
        if (idx !== -1) { setSection(idx); return true }
      }
    }
  }

  // Match against first line of each section (keyword overlap)
  const words = t.split(/\s+/).filter(w => w.length > 3)
  let bestIdx = -1, bestHits = 0
  sections.forEach((sec, i) => {
    const line = firstLine(sec.text).toLowerCase()
    const hits = words.filter(w => line.includes(w)).length
    if (hits > bestHits && hits >= Math.max(1, Math.floor(words.length * 0.4))) {
      bestHits = hits; bestIdx = i
    }
  })
  if (bestIdx !== -1) { setSection(bestIdx); return true }

  return false
}

/* ── Speech Recognition ── */
let recognition = null

function buildRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  const r = new SR()
  r.continuous = true
  r.interimResults = true
  r.lang = 'en-US'

  r.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript
      if (event.results[i].isFinal) handleFinal(t.trim())
      else interim += t
    }
    interimTranscript.value = interim
  }

  r.onerror = (e) => {
    if (e.error === 'no-speech') return
    errorMsg.value = `Mic error: ${e.error}`
    status.value = 'error'
  }

  r.onend = () => { if (isListening.value) r.start() }
  return r
}

function toggleListening() {
  if (!recognition) recognition = buildRecognition()
  if (!recognition) { errorMsg.value = 'Speech recognition not supported in this browser.'; return }

  if (isListening.value) {
    isListening.value = false
    status.value = 'idle'
    recognition.stop()
  } else {
    errorMsg.value = ''
    lastResult.value = null
    isListening.value = true
    status.value = 'listening'
    recognition.start()
  }
}

async function fetchAndBroadcastVerse(transcript) {
  const r = await fetch('/api/ai-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, translationId: selectedTranslation.value, meetingName: selectedMeeting.value || null }),
  })
  const data = await r.json()
  if (data.handled) {
    lastResult.value = data
    currentSlide.value = data.slideText
    lastVerseRef.value = data.parsedRef
    history.value.unshift({ reference: data.reference, slideText: data.slideText })
    if (history.value.length > 20) history.value.pop()
    status.value = isListening.value ? 'listening' : 'idle'
    return true
  }
  return false
}

async function handleFinal(transcript) {
  if (!transcript) return
  lastFinal.value = transcript
  interimTranscript.value = ''
  status.value = 'processing'

  const t = transcript.toLowerCase().trim()

  // 1. If a song is active, check for section callouts first
  if (activeSong.value && detectCallout(transcript)) {
    lastResult.value = { handled: true, reference: `Section: ${sectionLabel(activeSong.value.sections[activeSectionIndex.value], activeSectionIndex.value)}` }
    status.value = 'listening'
    return
  }

  // 2. "Next verse" — advance from last loaded verse
  if (NEXT_VERSE_PHRASES.has(t) && lastVerseRef.value && selectedTranslation.value) {
    const { book, chapter, endVerse } = lastVerseRef.value
    const nextTranscript = `${book} ${chapter} ${endVerse + 1}`
    try {
      const handled = await fetchAndBroadcastVerse(nextTranscript)
      if (handled) return
      lastResult.value = { handled: false, message: 'No more verses in this chapter' }
    } catch {}
    status.value = isListening.value ? 'listening' : 'idle'
    return
  }

  // 3. Try Bible reference (only if a translation is selected)
  if (selectedTranslation.value) {
    try {
      const handled = await fetchAndBroadcastVerse(transcript)
      if (handled) return
    } catch {}
  }

  // 3. Try song identification
  try {
    const r = await fetch('/api/assistant/identify-song', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    })
    const data = await r.json()
    if (data.matched) {
      pendingSongs.value = data.songs
      lastResult.value = null
    } else {
      lastResult.value = { handled: false, message: 'No match found' }
    }
  } catch (err) {
    errorMsg.value = `Request failed: ${err.message}`
    status.value = 'error'
    return
  }

  status.value = isListening.value ? 'listening' : 'idle'
}

async function rebroadcast(item) {
  if (!selectedMeeting.value) return
  try {
    const r = await fetch('/api/ai-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: item.reference, translationId: selectedTranslation.value, meetingName: selectedMeeting.value }),
    })
    const data = await r.json()
    currentSlide.value = item.slideText
    if (data.parsedRef) lastVerseRef.value = data.parsedRef
  } catch {}
}

onMounted(async () => {
  await Promise.all([loadMeetings(), loadLanguages()])
  await onLangChange()
})

onUnmounted(() => {
  if (recognition) { recognition.stop(); recognition = null }
})
</script>

<style scoped>
.assistant-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-base);
  color: var(--text-primary);
}

/* ── Toolbar ── */
.assistant-toolbar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding: 14px 20px;
  background: var(--bg-raised);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.toolbar-group { display: flex; flex-direction: column; gap: 4px; }
.toolbar-label { font-size: 0.72em; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.toolbar-select {
  background: var(--bg-base);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.9em;
  min-width: 150px;
}
.listen-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  background: var(--accent);
  color: #fff;
  transition: background 0.15s, transform 0.1s;
  margin-left: auto;
}
.listen-btn:hover:not(:disabled) { background: var(--accent-hover); transform: scale(1.03); }
.listen-btn.listening { background: #c0392b; animation: pulse-btn 1.4s ease-in-out infinite; }
.listen-btn:disabled { opacity: 0.45; cursor: not-allowed; }
@keyframes pulse-btn {
  0%, 100% { box-shadow: 0 0 0 0 rgba(192,57,43,0.5); }
  50%       { box-shadow: 0 0 0 8px rgba(192,57,43,0); }
}

/* ── Body ── */
.assistant-body { display: flex; flex: 1; overflow: hidden; }

/* ── Slide preview ── */
.slide-preview-panel {
  flex: 1.2;
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-right: 1px solid var(--border);
  overflow: hidden;
}
.panel-title { font-size: 0.75em; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 10px; }
.slide-preview {
  flex: 1;
  background: var(--bg-raised);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 24px;
}
.slide-preview.empty { border: 2px dashed var(--border); }
.slide-empty-hint { color: var(--text-faint); font-size: 0.95em; }
.slide-text {
  font-size: clamp(1em, 2vw, 1.5em);
  font-weight: 600;
  white-space: pre-wrap;
  word-break: break-word;
  text-align: center;
  line-height: 1.5;
  margin: 0;
  font-family: inherit;
}

/* ── Song section panel ── */
.section-panel {
  width: 220px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--bg-raised);
  overflow: hidden;
}
.section-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 14px 8px;
  border-bottom: 1px solid var(--border);
}
.song-title { font-size: 0.95em; font-weight: 600; color: var(--text-primary); margin-top: 2px; }
.exit-song-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  padding: 2px;
  display: flex;
}
.exit-song-btn:hover { color: #e74c3c; }

.section-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
.section-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}
.section-item:hover { background: var(--bg-base); }
.section-item.active { background: var(--accent); }
.section-item.sending { animation: sent-flash 0.6s ease-out; }
@keyframes sent-flash {
  0%   { background: var(--accent); }
  100% { background: transparent; }
}
.section-item.active .section-preview { color: #fff; }

.section-badge {
  font-size: 0.7em;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 24px;
  text-align: center;
  background: var(--bg-base);
  color: var(--text-muted);
  flex-shrink: 0;
}
.section-item.active .section-badge { background: rgba(255,255,255,0.2); color: #fff; }
.section-badge.chorus { background: rgba(29,185,84,0.15); color: var(--accent); }
.section-badge.bridge { background: rgba(155,89,182,0.15); color: #9b59b6; }
.section-item.active .section-badge.chorus,
.section-item.active .section-badge.bridge { background: rgba(255,255,255,0.2); color: #fff; }

.section-preview { font-size: 0.78em; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.section-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
}
.nav-btn-sec {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
}
.nav-btn-sec:disabled { opacity: 0.3; cursor: not-allowed; }
.nav-btn-sec:hover:not(:disabled) { background: var(--bg-base); }
.section-counter { font-size: 0.8em; color: var(--text-muted); }

/* ── Voice panel ── */
.voice-panel {
  width: 300px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow-y: auto;
}

/* ── Song candidates list ── */
.song-candidates {
  background: var(--bg-raised);
  border: 1px solid var(--accent);
  border-radius: 10px;
  margin-bottom: 14px;
  overflow: hidden;
}
.song-candidates-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--border);
}
.dismiss-all-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  display: flex;
  padding: 0;
}
.dismiss-all-btn:hover { color: #e74c3c; }

.song-candidate-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}
.song-candidate-item:last-child { border-bottom: none; }
.song-candidate-item:hover { background: rgba(29,185,84,0.08); }
.candidate-info { flex: 1; min-width: 0; }
.candidate-title { font-size: 0.92em; font-weight: 600; color: var(--text-primary); }
.candidate-preview { font-size: 0.78em; color: var(--text-muted); font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.candidate-arrow { color: var(--accent); font-size: 20px; }

/* ── Status ── */
.status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.dot_idle       { background: var(--text-faint); }
.dot_listening  { background: #2ecc71; animation: blink 1s ease-in-out infinite; }
.dot_processing { background: #f39c12; }
.dot_error      { background: #e74c3c; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.status-label { font-size: 0.88em; color: var(--text-muted); }

.transcript-box {
  background: var(--bg-raised);
  border-radius: 8px;
  padding: 12px 14px;
  min-height: 64px;
  margin-bottom: 12px;
  font-size: 0.9em;
  line-height: 1.5;
}
.interim      { color: var(--text-muted); font-style: italic; margin: 0; }
.final        { color: var(--text-primary); margin: 0; }
.transcript-hint { color: var(--text-faint); font-size: 0.85em; margin: 0; }

.result-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 0.88em;
  font-weight: 500;
}
.result-card.success { background: rgba(46,204,113,0.12); color: #2ecc71; }
.result-card.miss    { background: rgba(189,195,199,0.1); color: var(--text-muted); }
.result-icon { font-size: 16px; }

.error-msg { color: #e74c3c; font-size: 0.83em; margin-bottom: 10px; }

.history { display: flex; flex-direction: column; gap: 6px; }
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-raised);
  border-radius: 6px;
  font-size: 0.85em;
}
.history-ref { color: var(--text-primary); }
.history-rebroadcast { background: none; border: none; color: var(--accent); cursor: pointer; padding: 2px; display: flex; }
.history-rebroadcast:hover { color: var(--accent-hover); }

/* ── Mobile ── */
@media (max-width: 700px) {
  .assistant-body { flex-direction: column; }
  .slide-preview-panel { border-right: none; border-bottom: 1px solid var(--border); flex: none; height: 40%; }
  .section-panel { width: 100%; border-right: none; border-bottom: 1px solid var(--border); max-height: 200px; }
  .voice-panel { width: 100%; }
}
</style>
