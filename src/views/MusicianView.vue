<template>
  <div class="musician-layout">
    <div class="main-area">
      <div v-if="currentSession" class="session-editor">
        <div class="se-title">{{ currentSession.name }}</div>
        <div class="se-hint" v-if="!sessionSongs.length">Click a song in the library to add it &rarr;</div>
        <div class="se-songs">
          <div
            v-for="(song, idx) in sessionSongs"
            :key="idx"
            class="se-song"
          >
            <span class="se-pos">{{ idx + 1 }}</span>
            <span class="se-name">{{ song.title }}</span>
            <div class="se-actions">
              <button class="se-move" :disabled="idx === 0" @click="moveSong(idx, -1)">&#x25B2;</button>
              <button class="se-move" :disabled="idx === sessionSongs.length - 1" @click="moveSong(idx, 1)">&#x25BC;</button>
              <button class="se-remove" @click="removeSong(idx)">&#x2715;</button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-hint">Create or select a session</div>
    </div>

    <div class="sidebar">
      <div class="sidebar-scroll">
      <!-- Sessions -->
      <div class="panel">
        <div class="section-header">
          <span>Sessions</span>
          <button class="add-btn" @click="createSession">+</button>
        </div>
        <div class="item-list">
          <div
            v-for="s in sessions"
            :key="s.id"
            class="list-item"
            :class="{ active: currentSessionId === s.id }"
            @click="loadSession(s.id)"
          >
            <span class="list-item-text">{{ s.name }}</span>
            <button class="share-btn" @click.stop="openShareModal(s)">Share</button>
            <span v-if="s.sharedToSlides" class="sharing-status">Shared to Slides</span>
            <button class="delete-btn" @click.stop="deleteSession(s.id)">&#x2715;</button>
          </div>
        </div>
      </div>

      <!-- Share Modal -->
      <div v-if="showShareModal" class="modal-overlay">
        <div class="modal">
          <h3>Share Session</h3>
          <label>
            <input type="checkbox" v-model="shareToSlides" /> Share to Slides (public)
          </label>
          <div style="margin: 10px 0;">
            <label>Add user email to share with:</label>
            <input v-model="shareWithInput" class="share-input" placeholder="user@email.com" />
            <button @click="addShareWith">Add</button>
          </div>
          <div v-if="sharedWithList.length">
            <label>Shared with:</label>
            <ul class="shared-list">
              <li v-for="(email, idx) in sharedWithList" :key="email">
                {{ email }} <button @click="removeShareWith(idx)">Remove</button>
              </li>
            </ul>
          </div>
          <div class="modal-actions">
            <button @click="saveSharing">Save</button>
            <button @click="closeShareModal">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Song Library -->
      <div class="panel">
        <div class="section-header">
          <span>Song Library</span>
          <span class="header-actions">
            <button class="add-btn" @click="showImport = true" title="Import song">&#x2B07;</button>
            <button class="add-btn" @click="createSong">+</button>
          </span>
        </div>
        <select v-model="filterLang" @change="onLangChange" class="lang-select">
          <option value="">All languages</option>
          <option v-if="showAllLangs" value="__show_less__">── Show fewer languages ──</option>
          <option v-for="l in visibleLanguages" :key="l.code" :value="l.code" :disabled="l._sep">{{ l.name }}</option>
          <option v-if="!showAllLangs" value="__show_more__">── Show more languages ──</option>
        </select>
        <label class="search-label">Search</label>
        <input v-model="searchQuery" class="search-input" placeholder="Search songs…" />
        <div style="height:8px"></div>
        <div class="item-list">
          <div
            v-for="song in librarySongs"
            :key="song.id || song.filename"
            class="list-item"
          >
            <span class="list-item-text" @click="onSongClick(song)">{{ song.title }}</span>
            <span class="item-actions" v-if="song.id">
              <button class="edit-btn" @click.stop="editSong(song.id)" title="Edit song">&#x270E;</button>
              <button class="delete-btn" @click.stop="deleteSong(song.id)">&#x2715;</button>
            </span>
            <span class="item-actions" v-else>
              <button class="edit-btn" @click.stop="editXmlSong(song)" title="Edit song">&#x270E;</button>
              <span class="xml-badge">XML</span>
            </span>
          </div>
        </div>
      </div><!-- end sidebar-scroll -->
    </div>

    <!-- Song Preview overlay -->
    <div v-if="previewSong" class="preview-overlay" @click.self="previewSong = null">
      <div class="preview-box">
        <div class="preview-title">{{ previewSong.title }}</div>
        <div v-if="previewSong.key" class="preview-key">Key: {{ previewSong.key }}</div>
        <div class="preview-sections">
          <div v-for="(sec, i) in previewSong.sections" :key="i" class="preview-section">
            <div class="preview-section-label">{{ sec.type }} {{ sec.number || '' }}</div>
            <pre class="preview-section-text">{{ sec.text }}</pre>
          </div>
          <div v-if="!previewSong.sections || !previewSong.sections.length" class="preview-empty">No sections</div>
        </div>
        <div class="preview-actions">
          <button class="preview-cancel" @click="previewSong = null">Cancel</button>
          <button class="preview-add" @click="addPreviewToSession">Add to Session</button>
        </div>
      </div>
    </div>

    <!-- Import overlay -->
    <div v-if="showImport" class="import-overlay" @click.self="showImport = false">
      <div class="import-box">
        <div class="import-title">Import Chord Sheet</div>
        <textarea v-model="importText" class="import-textarea" placeholder="Paste chord sheet here..."></textarea>
        <div class="import-actions">
          <button class="import-cancel" @click="showImport = false; importText = ''">Cancel</button>
          <button class="import-go" @click="doImport">Import</button>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
// Show more/less for language select
import { useRouter } from 'vue-router'
import { useLanguagePref } from '../composables/useLanguagePref.js'

// --- Sharing state ---
const showShareModal = ref(false)
const shareToSlides = ref(false)
const shareWithInput = ref('')
const sharedWithList = ref([])
let sharingSessionId = null

function openShareModal(session) {
  sharingSessionId = session.id
  showShareModal.value = true
  shareToSlides.value = !!session.sharedToSlides
  sharedWithList.value = Array.isArray(session.sharedWith) ? [...session.sharedWith] : []
}
function closeShareModal() {
  showShareModal.value = false
}
function addShareWith() {
  const email = shareWithInput.value.trim()
  if (email && !sharedWithList.value.includes(email)) {
    sharedWithList.value.push(email)
    shareWithInput.value = ''
  }
}
function removeShareWith(idx) {
  sharedWithList.value.splice(idx, 1)
}
async function saveSharing() {
  if (!sharingSessionId) return
  try {
    await fetch(`/api/setlists/${sharingSessionId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sharedWith: sharedWithList.value, sharedToSlides: shareToSlides.value })
    })
    // Update local session list
    const idx = sessions.value.findIndex(s => s.id === sharingSessionId)
    if (idx !== -1) {
      sessions.value[idx].sharedToSlides = shareToSlides.value
      sessions.value[idx].sharedWith = [...sharedWithList.value]
    }
    closeShareModal()
  } catch (e) {
    alert('Error saving sharing settings')
  }
}

const router = useRouter()
const { langPref, setLang, recentSongLangs, addRecentSongLang } = useLanguagePref()

const allSongs = ref([])
const sessions = ref([])
const currentSessionId = ref(null)
const currentSession = ref(null)
const sessionSongs = ref([])
const showImport = ref(false)
const importText = ref('')
const previewSong = ref(null)
const previewSource = ref(null)
const languages = ref([])
const showAllLangs = ref(false)
const filterLang = ref(langPref.value)
const searchQuery = ref('')

const visibleLanguages = computed(() => {
  const all = showAllLangs.value ? languages.value : languages.value.filter(l => l.popular || l.code === filterLang.value)
  const recent = recentSongLangs.value
  if (!recent.length) return all
  const recentSet = new Set(recent)
  const top = recent.map(c => all.find(l => l.code === c)).filter(Boolean)
  const rest = all.filter(l => !recentSet.has(l.code))
  return [...top, { code: '__sep_recent__', name: '────────────', _sep: true }, ...rest]
})
const xmlSongsForLang = ref([])

// Cross-window sync: when langPref changes from another tab, update local filter
watch(langPref, (code) => {
  if (code !== filterLang.value) {
    filterLang.value = code
    onLangChange()
  }
})

const librarySongs = computed(() => {
  let songs
  if (!filterLang.value) {
    songs = allSongs.value
  } else {
    const dbSongs = allSongs.value.filter(s => s.language === filterLang.value)
    songs = [...dbSongs, ...xmlSongsForLang.value]
  }
  if (!searchQuery.value) return songs
  const q = searchQuery.value.toLowerCase()
  return songs.filter(s => s.title.toLowerCase().includes(q))
})

/* --- Songs --- */
async function loadAllSongs() {
  try {
    const res = await fetch('/api/songs')
    allSongs.value = await res.json()
  } catch (e) { console.error(e) }
}

async function createSong() {
  try {
    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled', language: filterLang.value || 'en' })
    })
    const song = await res.json()
    await loadAllSongs()
    router.push({ path: '/song-editor', query: { id: song.id } })
  } catch (e) { console.error(e) }
}

async function deleteSong(id) {
  if (!confirm('Delete this song and all its sections?')) return
  try {
    await fetch('/api/songs/' + id, { method: 'DELETE' })
    await loadAllSongs()
    if (currentSessionId.value) {
      sessionSongs.value = sessionSongs.value.filter(s => s.song_id !== id)
      await saveSessionSongs()
    }
  } catch (e) { console.error(e) }
}

function editSong(id) {
  router.push({ path: '/song-editor', query: { id } })
}

async function editXmlSong(song) {
  try {
    const res = await fetch('/api/song-library/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: filterLang.value, filename: song.filename })
    })
    const imported = await res.json()
    await loadAllSongs()
    await onLangChange()
    router.push({ path: '/song-editor', query: { id: imported.id } })
  } catch (e) {
    console.error('Import failed', e)
    alert('Import failed: ' + e.message)
  }
}

/* --- Sessions (setlists) --- */
async function loadSessions() {
  try {
    const res = await fetch('/api/setlists')
    sessions.value = await res.json()
  } catch (e) { console.error(e) }
}

async function createSession() {
  const name = prompt('Session name:')
  if (!name) return
  try {
    const res = await fetch('/api/setlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const s = await res.json()
    await loadSessions()
    loadSession(s.id)
  } catch (e) { console.error(e) }
}

async function deleteSession(id) {
  if (!confirm('Delete this session?')) return
  try {
    await fetch('/api/setlists/' + id, { method: 'DELETE' })
    if (currentSessionId.value === id) {
      currentSessionId.value = null
      currentSession.value = null
      sessionSongs.value = []
    }
    await loadSessions()
  } catch (e) { console.error(e) }
}

async function loadSession(id) {
  try {
    const res = await fetch('/api/setlists/' + id)
    const s = await res.json()
    currentSessionId.value = s.id
    currentSession.value = s
    sessionSongs.value = s.songs || []
  } catch (e) { console.error(e) }
}

async function saveSessionSongs() {
  if (!currentSessionId.value) return
  try {
    await fetch('/api/setlists/' + currentSessionId.value + '/songs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songIds: sessionSongs.value.map(s => s.song_id) })
    })
  } catch (e) { console.error(e) }
}

function addSongToSession(song) {
  if (!currentSessionId.value) {
    alert('Select or create a session first')
    return
  }
  sessionSongs.value.push({ song_id: song.id, title: song.title })
  saveSessionSongs()
}

function removeSong(index) {
  sessionSongs.value.splice(index, 1)
  saveSessionSongs()
}

function moveSong(index, dir) {
  const target = index + dir
  if (target < 0 || target >= sessionSongs.value.length) return
  const arr = [...sessionSongs.value]
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  sessionSongs.value = arr
  saveSessionSongs()
}

/* --- Chord Sheet Importer --- */
function parseChordSheet(raw) {
  const allLines = raw.split('\n')
  // Strip Page X/Y markers
  const lines = allLines.filter(l => !/^\s*page\s+\d+\s*\/\s*\d+\s*$/i.test(l))

  // Title = first non-empty line
  let title = 'Untitled'
  let startIdx = 0
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t) { title = t; startIdx = i + 1; break }
  }

  // Section header pattern — matches "Verse One", "Verse 1:", "[Verse 1]", "[Chorus]", etc.
  const sectionWords = 'intro|verse|chorus|bridge|outro|pre[- ]?chorus|tag|ending|interlude|refrain'
  const numberWords = 'one|two|three|four|five|six|seven|eight|nine|ten|\\d+'
  const headerRe = new RegExp(
    '^\\[?(' + sectionWords + ')\\s*(' + numberWords + ')?\\]?\\s*:?\\s*$', 'i'
  )

  // Chord token test
  const chordRe = /^[A-G][#b]?(m|min|maj|dim|aug|sus[24]|add\d+|[2-79]|11|13|maj7|m7|M7)?(\/?[A-G][#b]?)?$/

  function isChordLine(line) {
    const t = line.trim()
    if (!t) return false
    // Replace em-dashes between chords with spaces
    const tokens = t.replace(/[\u2014\u2013]+/g, ' ').split(/\s+/).filter(s => s)
    if (!tokens.length) return false
    let hits = 0
    for (let tk of tokens) {
      // Clean trailing/leading slashes and dashes that are notation artifacts
      tk = tk.replace(/[\/\-]+$/g, '').replace(/^[\/]+(?=[A-G])/, '/')
      if (!tk) continue
      if (/^\/[A-G][#b]?$/.test(tk) || chordRe.test(tk)) hits++
    }
    const real = tokens.filter(tk => {
      tk = tk.replace(/[\/\-]+$/g, '')
      return tk.length > 0
    }).length
    return real > 0 && hits / real >= 0.5
  }

  function typeFor(name) {
    const l = name.toLowerCase()
    if (l.startsWith('verse')) return 'verse'
    if (l.startsWith('chorus') || l.startsWith('refrain')) return 'chorus'
    return 'bridge'
  }

  function parseChordsFromLine(chordLine, baseIdx) {
    const chords = {}
    // Pre-process: replace em-dashes with spaces so "D—Bm—A" splits into separate chords
    const cl = chordLine.replace(/[\u2014\u2013]/g, ' ')
    let i = 0
    while (i < cl.length) {
      if (cl[i] === ' ') { i++; continue }
      let j = i
      while (j < cl.length && cl[j] !== ' ') j++
      let chord = cl.substring(i, j)
      // Clean trailing notation slashes/dashes but keep slash chords
      chord = chord.replace(/\/{2,}$/g, '').replace(/-+$/g, '')
      if (chord && chord !== '-') {
        chords[baseIdx + i] = chord
      }
      i = j
    }
    return chords
  }

  // Build sections
  const sections = []
  let curType = 'verse'
  let pairs = [] // { chordLine: string|null, lyric: string }

  function flush() {
    if (!pairs.length) return
    let text = ''
    let chords = {}
    let charIdx = 0
    for (const p of pairs) {
      if (text) { text += '\n'; charIdx++ }
      const lyric = p.lyric
      if (p.chordLine !== null) {
        const lc = parseChordsFromLine(p.chordLine, charIdx)
        Object.assign(chords, lc)
      }
      text += lyric
      charIdx += lyric.length
    }
    if (text.trim() || Object.keys(chords).length) {
      sections.push({ type: curType, text, chords: JSON.stringify(chords) })
    }
    pairs = []
  }

  let i = startIdx
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) { i++; continue }

    const hm = trimmed.match(headerRe)
    if (hm) {
      flush()
      curType = typeFor(hm[1])
      i++
      continue
    }

    if (isChordLine(line)) {
      // Look ahead for a lyric line
      let ni = i + 1
      while (ni < lines.length && !lines[ni].trim()) ni++

      if (ni < lines.length) {
        const nt = lines[ni].trim()
        if (nt && !headerRe.test(nt) && !isChordLine(lines[ni])) {
          // Pad lyric so it's at least as wide as the chord line
          const lyric = lines[ni].padEnd(line.length)
          pairs.push({ chordLine: line, lyric })
          i = ni + 1
          continue
        }
      }
      // Chord-only line (e.g. intro)
      pairs.push({ chordLine: line, lyric: ' '.repeat(line.length) })
      i++
      continue
    }

    // Plain lyric line
    pairs.push({ chordLine: null, lyric: line })
    i++
  }
  flush()

  return { title, sections }
}

async function doImport() {
  const raw = importText.value.trim()
  if (!raw) return

  const parsed = parseChordSheet(raw)

  try {
    // Create the song
    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: parsed.title })
    })
    const song = await res.json()

    // Save sections if any
    if (parsed.sections.length) {
      await fetch('/api/songs/' + song.id + '/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: parsed.sections })
      })
    }

    showImport.value = false
    importText.value = ''
    await loadAllSongs()

    // Open in editor so user can review
    router.push({ path: '/song-editor', query: { id: song.id } })
  } catch (e) {
    console.error('Import failed', e)
    alert('Import failed: ' + e.message)
  }
}

/* --- Languages & XML Library --- */
async function loadLanguages() {
  try {
    const res = await fetch('/api/song-library/languages')
    languages.value = await res.json()
  } catch (e) { console.error(e) }
}

let prevFilterLang = filterLang.value
async function onLangChange() {
  if (filterLang.value === '__show_more__') {
    showAllLangs.value = true
    filterLang.value = prevFilterLang
    return
  }
  if (filterLang.value === '__show_less__') {
    showAllLangs.value = false
    filterLang.value = prevFilterLang
    return
  }
  prevFilterLang = filterLang.value
  if (filterLang.value) {
    addRecentSongLang(filterLang.value)
    setLang(filterLang.value)
  }
  if (!filterLang.value) { xmlSongsForLang.value = []; return }
  try {
    const res = await fetch('/api/song-library/' + filterLang.value)
    xmlSongsForLang.value = await res.json()
  } catch (e) { console.error(e) }
}

async function onSongClick(song) {
  // Fetch full song details for preview
  try {
    let full
    if (song.id) {
      const res = await fetch('/api/songs/' + song.id)
      full = await res.json()
      previewSource.value = { type: 'db', song }
    } else {
      const res = await fetch('/api/song-library/' + filterLang.value + '/' + encodeURIComponent(song.filename))
      full = await res.json()
      previewSource.value = { type: 'xml', song }
    }
    previewSong.value = full
  } catch (e) {
    console.error('Preview fetch failed', e)
  }
}

async function addPreviewToSession() {
  const src = previewSource.value
  previewSong.value = null
  if (!src) return
  if (src.type === 'db') {
    addSongToSession(src.song)
  } else {
    // XML song — import first
    try {
      const res = await fetch('/api/song-library/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: filterLang.value, filename: src.song.filename })
      })
      const imported = await res.json()
      await loadAllSongs()
      await onLangChange()
      addSongToSession({ id: imported.id, title: imported.title, song_id: imported.id })
    } catch (e) {
      console.error('Import failed', e)
      alert('Import failed: ' + e.message)
    }
  }
}

onMounted(async () => {
  await loadLanguages()
  loadAllSongs()
  loadSessions()
  // Apply saved preference
  if (langPref.value && languages.value.find(l => l.code === langPref.value)) {
    filterLang.value = langPref.value
    onLangChange()
  }
})
</script>
<style scoped>
/* ── Layout ── */
.musician-layout {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-raised);
  color: var(--text-primary);
  font-family: inherit;
}

.main-area {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

/* ── Right sidebar ── */
.sidebar {
  width: 280px;
  min-width: 200px;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-light);
  background: var(--bg-surface);
  overflow: hidden;
}

/* All sidebar content scrolls */
.sidebar-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Session editor ── */
.session-editor { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.se-title { font-size: 18px; font-weight: bold; padding-bottom: 4px; border-bottom: 1px solid var(--border); }
.se-hint  { color: var(--text-faint); font-style: italic; font-size: 13px; }
.se-songs { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; }

.se-song {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: var(--radius);
  background: var(--bg-surface); font-size: 13px;
}
.se-pos  { color: var(--text-faint); font-size: 11px; min-width: 16px; }
.se-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.se-actions { display: flex; gap: 4px; }

.se-move, .se-remove {
  background: none; border: none; color: var(--text-faint);
  cursor: pointer; padding: 2px 5px; border-radius: var(--radius-sm); font-size: 12px; font-family: inherit;
}
.se-move:hover:not(:disabled)  { color: var(--text-primary); background: var(--bg-hover); }
.se-move:disabled               { opacity: 0.25; cursor: default; }
.se-remove:hover                { color: var(--danger); background: var(--danger-hover); }

.empty-hint {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--text-faint); font-size: 15px;
}

/* ── Sidebar panels ── */
.panel {
  display: flex; flex-direction: column; gap: 6px;
  padding-top: 10px; border-top: 1px solid var(--border);
}
.panel:first-child { border-top: none; padding-top: 0; }

.section-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--text-faint);
}
.header-actions { display: flex; gap: 4px; }

.add-btn {
  width: 28px; height: 28px; border-radius: var(--radius-sm); border: none;
  background: var(--bg-active); color: var(--text-primary);
  font-size: 16px; cursor: pointer; font-family: inherit;
  display: flex; align-items: center; justify-content: center;
}
.add-btn:hover { background: #666; }

/* ── Lists ── */
.item-list { display: flex; flex-direction: column; gap: 3px; }
.list-item {
  display: flex; align-items: center; padding: 6px 8px;
  border-radius: var(--radius); background: var(--bg-hover);
  cursor: pointer; font-size: 13px; color: var(--text-primary); gap: 6px;
}
.list-item:hover  { background: var(--bg-active); }
.list-item.active { background: var(--accent-dim); color: var(--accent); }
.list-item-text   { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-actions     { display: flex; gap: 2px; margin-left: auto; }

.edit-btn {
  background: none; border: none; color: var(--text-faint);
  font-size: 13px; cursor: pointer; padding: 2px 4px; border-radius: 4px; font-family: inherit;
}
.edit-btn:hover { color: var(--accent); background: var(--accent-dim); }

.delete-btn {
  background: none; border: none; color: var(--text-faint);
  font-size: 13px; cursor: pointer; padding: 2px 4px; border-radius: 4px; font-family: inherit;
}
.delete-btn:hover { color: var(--danger); background: var(--danger-hover); }

.share-btn {
  background: #2a6a8a; color: #fff; border: none;
  border-radius: var(--radius-sm); padding: 3px 10px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.share-btn:hover { background: #3a8aba; }
.sharing-status { font-size: 11px; color: #8ad; }
.xml-badge { font-size: 10px; color: var(--text-faint); background: var(--bg-active); padding: 1px 5px; border-radius: 3px; }

/* ── Search / filter ── */
.lang-select, .search-input {
  width: 100%; padding: 6px 8px; border-radius: var(--radius);
  border: 1px solid var(--border); background: var(--bg-input);
  color: var(--text-primary); font-size: 13px; font-family: inherit;
}
.lang-select option { background: var(--bg-surface); }
.search-label { font-size: 11px; color: var(--text-faint); }

/* ── Modals ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: var(--bg-surface); color: var(--text-primary);
  border-radius: var(--radius-lg); padding: 24px 28px;
  min-width: 300px; max-width: 90vw; box-shadow: 0 8px 40px rgba(0,0,0,0.5);
}
.modal h3 { margin: 0 0 16px; font-size: 16px; }
.modal-actions { display: flex; gap: 10px; margin-top: 16px; }
.share-input {
  padding: 6px 8px; border-radius: var(--radius); border: 1px solid var(--border);
  background: var(--bg-input); color: var(--text-primary); font-size: 13px; margin-right: 6px;
}
.shared-list { list-style: none; padding: 0; margin: 6px 0; }
.shared-list li { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 13px; }

/* ── Import / Preview overlays ── */
.import-overlay, .preview-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center; z-index: 200;
}
.import-box, .preview-box {
  background: var(--bg-surface); border-radius: var(--radius-lg); padding: 20px;
  width: min(90vw, 500px); max-height: 85vh;
  display: flex; flex-direction: column; gap: 12px;
}
.import-title, .preview-title { font-size: 17px; font-weight: bold; }
.import-textarea {
  flex: 1; min-height: 160px; padding: 10px; border-radius: var(--radius);
  border: 1px solid var(--border); background: var(--bg-input);
  color: var(--text-primary); font-size: 13px; resize: vertical; font-family: monospace;
}
.import-actions, .preview-actions { display: flex; gap: 10px; justify-content: flex-end; }
.preview-key { font-size: 12px; color: var(--text-muted); }
.preview-sections { flex: 1; overflow-y: auto; }
.preview-section { margin-bottom: 10px; }
.preview-section-label { font-size: 11px; font-weight: bold; color: var(--text-faint); text-transform: uppercase; margin-bottom: 2px; }
.preview-section-text { font-family: monospace; font-size: 13px; color: var(--text-primary); white-space: pre-wrap; margin: 0; line-height: 1.4; }
.preview-empty { color: var(--text-faint); font-style: italic; font-size: 13px; }

.import-go, .preview-add {
  padding: 8px 18px; border-radius: var(--radius); border: none;
  background: #2a6a2a; color: #fff; font-weight: bold; cursor: pointer; font-family: inherit;
}
.import-go:hover, .preview-add:hover { background: #3a8a3a; }
.import-cancel, .preview-cancel {
  padding: 8px 18px; border-radius: var(--radius); border: none;
  background: var(--bg-active); color: var(--text-primary); cursor: pointer; font-family: inherit;
}
.import-cancel:hover, .preview-cancel:hover { background: #555; }

/* ── Mobile portrait ── */
@media (max-width: 768px) and (orientation: portrait), (max-width: 500px) {
  .musician-layout { flex-direction: column; }
  .main-area { height: 40%; flex: none; flex-shrink: 0; padding: 8px; overflow-y: auto; }
  .sidebar { width: 100%; min-width: 0; height: 60%; border-left: none; border-top: 1px solid var(--border-light); }
}
</style>