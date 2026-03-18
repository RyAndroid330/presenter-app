<template>
  <div class="editor-layout">
    <div class="main-area">
      <div v-if="editingSectionIndex !== null" class="chord-editor">
        <div v-for="(line, li) in textLines" :key="li" class="ce-line">
          <span v-for="c in line" :key="c.i" class="ce-cell">
            <span
              class="ce-slot"
              :class="{ filled: currentChords[c.i], clickable: true }"
              @click="openPicker(c.i)"
            ><span v-if="currentChords[c.i]" class="ce-chord">{{ currentChords[c.i] }}</span><span v-else class="ce-note-hint">♪</span></span>
            <span class="ce-char">{{ c.extra ? '\u00A0' : (c.c === ' ' ? '\u00A0' : c.c) }}</span>
          </span>
        </div>
      </div>
      <div v-else class="empty-hint">Select or add a section</div>
      <div v-if="editingSectionIndex !== null" class="lyrics-bar">
        <textarea v-model="currentText" @input="onTextInput" placeholder="Enter lyrics…" rows="3"></textarea>
        <button class="save-btn" @click="saveSection">Save Section</button>
      </div>
    </div>

    <!-- Chord picker dialog -->
    <div v-if="pickerOpen" class="pk-overlay" @click.self="pickerOpen = false">
      <div class="pk-box">
        <div class="pk-title">Select Chord</div>
        <div class="pk-grid">
          <div class="pk-hdr"></div>
          <div v-for="q in quals" :key="'h'+q[1]" class="pk-hdr">{{ q[0] }}</div>
          <template v-for="r in roots" :key="r">
            <div class="pk-root">{{ r }}</div>
            <button
              v-for="q in quals"
              :key="r+q[1]"
              class="pk-cell"
              :class="{ active: currentChords[pickerIdx] === r + q[1] + (pkBass ? '/' + pkBass : '') }"
              @click="pickChord(r, q[1])"
            >{{ r }}{{ q[1] }}</button>
          </template>
        </div>
        <div class="pk-bass-row">
          <span class="pk-bass-label">/&nbsp;Bass:</span>
          <button class="pk-bass-btn" :class="{ active: !pkBass }" @click="pkBass = ''">None</button>
          <button v-for="r in roots" :key="'b'+r" class="pk-bass-btn" :class="{ active: pkBass === r }" @click="pkBass = r">{{ r }}</button>
        </div>
        <button class="pk-clear" @click="doClearChord">Clear</button>
      </div>
    </div>

    <div class="sidebar">
      <button class="back-btn" @click="goBack">&#x2190; Back</button>
      <button class="save-back-btn" @click="saveAndBack">&#x2714; Save &amp; Back</button>

      <label class="field-label">Song Title</label>
      <div class="song-title-row">
        <input v-model="songTitle" @change="updateTitle" class="title-input" placeholder="Song title" />
      </div>

      <div class="meta-row">
        <div class="meta-field">
          <label class="field-label">Language</label>
          <select v-model="songLanguage" @change="onSongLangChange" class="meta-select">
            <option v-if="showAllLangs" value="__show_less__">── Show fewer languages ──</option>
            <option v-for="l in visibleLanguages" :key="l.code" :value="l.code" :disabled="l._sep">{{ l.name }}</option>
            <option v-if="!showAllLangs" value="__show_more__">── Show more languages ──</option>
          </select>
        </div>
        <div class="meta-field">
          <label class="field-label">Key</label>
          <select v-model="songKey" @change="updateMeta" class="meta-select">
            <option value="">—</option>
            <option v-for="k in allKeys" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
      </div>

      <div class="sections-panel">
        <div class="section-header">
          <span>Sections</span>
        </div>

        <div class="type-selector">
          <button v-for="t in sectionTypes" :key="t" class="type-btn" @click="addSection(t)">+ {{ t }}</button>
        </div>

        <div class="section-list">
          <div
            v-for="(section, index) in sections"
            :key="index"
            class="list-item"
            :class="{ active: editingSectionIndex === index }"
            @click="openSection(index)"
          >
            <span class="list-item-text">
              <strong>{{ section.type }}</strong> — {{ section.text.substring(0, 25) || '(empty)' }}{{ section.text.length > 25 ? '…' : '' }}
            </span>
            <div class="list-item-actions">
              <button class="move-btn" :disabled="index === 0" @click.stop="moveSection(index, -1)">&#x25B2;</button>
              <button class="move-btn" :disabled="index === sections.length - 1" @click.stop="moveSection(index, 1)">&#x25BC;</button>
              <button class="delete-btn" @click.stop="deleteSection(index)">&#x2715;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
// Show more/less for language select
import { useRoute, useRouter } from 'vue-router'
import { useLanguagePref } from '../composables/useLanguagePref.js'

const route = useRoute()
const router = useRouter()
const { setLang, recentSongLangs, addRecentSongLang } = useLanguagePref()
const songId = parseInt(route.query.id)

const sectionTypes = ['intro', 'verse', 'chorus', 'bridge']
const roots = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const quals = [
  ['maj', ''], ['m', 'm'], ['7', '7'], ['m7', 'm7'], ['maj7', 'maj7'],
  ['dim', 'dim'], ['aug', 'aug'], ['sus2', 'sus2'], ['sus4', 'sus4'],
  ['add9', 'add9'], ['6', '6'], ['9', '9']
]

const songTitle = ref('')
const songLanguage = ref('en')
const songKey = ref('')
const languages = ref([{code: 'en', name: 'English', popular: true}])
const showAllLangs = ref(false)

const visibleLanguages = computed(() => {
  const all = showAllLangs.value ? languages.value : languages.value.filter(l => l.popular || l.code === songLanguage.value)
  const recent = recentSongLangs.value
  if (!recent.length) return all
  const recentSet = new Set(recent)
  const top = recent.map(c => all.find(l => l.code === c)).filter(Boolean)
  const rest = all.filter(l => !recentSet.has(l.code))
  return [...top, { code: '__sep_recent__', name: '────────────', _sep: true }, ...rest]
})
const allKeys = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
                 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm']
const sections = ref([])
const editingSectionIndex = ref(null)

const currentText = ref('')
const currentChords = ref({})
const pickerOpen = ref(false)
const pickerIdx = ref(null)
const pkBass = ref('')

/* --- Computed --- */
const textLines = computed(() => {
  const t = currentText.value
  if (!t) return []
  const lines = t.split('\n')
  const out = []
  let idx = 0
  for (let li = 0; li < lines.length; li++) {
    const ln = lines[li]
    const cells = []
    for (let j = 0; j < ln.length; j++) cells.push({ c: ln[j], i: idx + j })
    for (let j = 0; j < 10; j++) cells.push({ c: '', i: 'x' + li + '_' + j, extra: true })
    out.push(cells)
    idx += ln.length + 1
  }
  return out
})

/* --- Navigation --- */
async function goBack() {
  // Delete song if still untitled/empty
  if (songId && (!songTitle.value.trim() || songTitle.value.trim() === 'Untitled')) {
    try {
      await fetch('/api/songs/' + songId, { method: 'DELETE' })
    } catch (e) { console.error(e) }
  }
  router.push('/musician')
}

async function saveAndBack() {
  if (!songTitle.value.trim()) {
    alert('Please enter a song title before saving.')
    return
  }
  if (editingSectionIndex.value !== null && currentText.value.trim()) {
    sections.value[editingSectionIndex.value].text = currentText.value
    sections.value[editingSectionIndex.value].chords = { ...currentChords.value }
  }
  await saveSectionsToDB()
  router.push('/musician')
}

/* --- Song loading --- */
async function loadLanguages() {
  try {
    const res = await fetch('/api/song-library/languages')
    languages.value = await res.json()
    if (!languages.value.find(l => l.code === 'en')) languages.value.unshift({code: 'en', name: 'English'})
  } catch (e) { console.error(e) }
}

async function loadSong() {
  if (!songId) return
  try {
    const res = await fetch('/api/songs/' + songId)
    const song = await res.json()
    songTitle.value = song.title
    songLanguage.value = song.language || 'en'
    songKey.value = song.key || ''
    sections.value = song.sections.map(s => ({
      type: s.type, text: s.text,
      chords: s.chords ? (typeof s.chords === 'string' ? JSON.parse(s.chords) : s.chords) : {}
    }))
  } catch (e) {
    console.error('Failed to load song', e)
  }
}

async function updateTitle() {
  if (!songId || !songTitle.value.trim()) return
  try {
    await fetch('/api/songs/' + songId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: songTitle.value, language: songLanguage.value, key: songKey.value })
    })
  } catch (e) {
    console.error('Failed to update title', e)
  }
}

let prevSongLang = songLanguage.value
function onSongLangChange() {
  if (songLanguage.value === '__show_more__') {
    showAllLangs.value = true
    songLanguage.value = prevSongLang
    return
  }
  if (songLanguage.value === '__show_less__') {
    showAllLangs.value = false
    songLanguage.value = prevSongLang
    return
  }
  prevSongLang = songLanguage.value
  addRecentSongLang(songLanguage.value)
  updateMeta()
}

async function updateMeta() {
  if (!songId) return
  // Persist language preference when user changes it
  if (songLanguage.value) setLang(songLanguage.value)
  try {
    await fetch('/api/songs/' + songId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: songTitle.value, language: songLanguage.value, key: songKey.value })
    })
  } catch (e) {
    console.error('Failed to update meta', e)
  }
}

async function saveSectionsToDB() {
  if (!songId) return
  try {
    await fetch('/api/songs/' + songId + '/sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sections: sections.value.map(s => ({
          type: s.type, text: s.text,
          chords: JSON.stringify(s.chords || {})
        }))
      })
    })
  } catch (e) {
    console.error('Failed to save sections', e)
  }
}

/* --- Sections --- */
function addSection(type) {
  sections.value.push({ type, text: '', chords: {} })
  editingSectionIndex.value = sections.value.length - 1
  currentText.value = ''
  currentChords.value = {}
  saveSectionsToDB()
}

function openSection(index) {
  editingSectionIndex.value = index
  const s = sections.value[index]
  currentText.value = s.text
  currentChords.value = { ...(s.chords || {}) }
}

function deleteSection(index) {
  sections.value.splice(index, 1)
  if (editingSectionIndex.value === index) {
    editingSectionIndex.value = null
    currentText.value = ''
    currentChords.value = {}
  } else if (editingSectionIndex.value !== null && editingSectionIndex.value > index) {
    editingSectionIndex.value--
  }
  saveSectionsToDB()
}

function moveSection(index, dir) {
  const target = index + dir
  if (target < 0 || target >= sections.value.length) return
  const arr = [...sections.value]
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  sections.value = arr
  if (editingSectionIndex.value === index) editingSectionIndex.value = target
  else if (editingSectionIndex.value === target) editingSectionIndex.value = index
  saveSectionsToDB()
}

function saveSection() {
  if (!currentText.value.trim()) return
  if (editingSectionIndex.value !== null) {
    sections.value[editingSectionIndex.value].text = currentText.value
    sections.value[editingSectionIndex.value].chords = { ...currentChords.value }
  } else {
    sections.value.push({ type: 'verse', text: currentText.value, chords: { ...currentChords.value } })
    editingSectionIndex.value = sections.value.length - 1
  }
  saveSectionsToDB()
}

function onTextInput() {
  if (editingSectionIndex.value !== null) {
    sections.value[editingSectionIndex.value].text = currentText.value
  }
}

/* --- Chord picker --- */
function openPicker(absIdx) {
  pickerIdx.value = absIdx
  const existing = currentChords.value[absIdx]
  if (existing && existing.includes('/')) {
    pkBass.value = existing.split('/')[1]
  } else {
    pkBass.value = ''
  }
  pickerOpen.value = true
}

function pickChord(root, qual) {
  let chord = root + qual
  if (pkBass.value) chord += '/' + pkBass.value
  currentChords.value = { ...currentChords.value, [pickerIdx.value]: chord }
  syncChordsToSection()
  pickerOpen.value = false
}

function doClearChord() {
  const copy = { ...currentChords.value }
  delete copy[pickerIdx.value]
  currentChords.value = copy
  syncChordsToSection()
  pickerOpen.value = false
}

function syncChordsToSection() {
  if (editingSectionIndex.value !== null) {
    sections.value[editingSectionIndex.value].chords = { ...currentChords.value }
    saveSectionsToDB()
  }
}

/* --- Lifecycle --- */
onMounted(() => {
  loadLanguages()
  loadSong()
})
</script>

<style scoped>
/* ── Layout ── */
.editor-layout {
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

/* Chord editor */
.chord-editor {
  flex: 1;
  overflow: auto;
  font-family: monospace;
  font-size: 14px;
  background: rgba(255,255,255,0.03);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: 16px;
}
.empty-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-faint);
  font-size: 15px;
}

/* Chord grid */
.ce-line  { display: flex; flex-wrap: nowrap; }
.ce-cell  { display: flex; flex-direction: column; align-items: flex-start; }
.ce-slot  { height: 22px; min-width: 1ch; cursor: pointer; border-radius: 3px; display: flex; align-items: center; padding: 0 2px; }
.ce-slot:hover, .ce-slot.clickable:hover { background: var(--accent-dim); }
.ce-chord { font-size: 12px; font-weight: bold; color: var(--accent); white-space: nowrap; }
.ce-note-hint { font-size: 10px; color: var(--border-light); }
.ce-char  { font-size: 14px; color: var(--text-primary); min-width: 1ch; white-space: pre; }

/* Lyrics bar — always visible */
.lyrics-bar {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding-top: 10px;
  align-items: flex-end;
}
.lyrics-bar textarea {
  flex: 1;
  min-height: 64px;
  max-height: 110px;
  padding: 8px 10px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 13px;
  resize: vertical;
  font-family: monospace;
}
.save-btn {
  padding: 10px 18px;
  border-radius: var(--radius);
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  flex-shrink: 0;
  align-self: flex-end;
}
.save-btn:hover { background: var(--accent-hover); }

/* ── Chord picker overlay ── */
.pk-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center; z-index: 300;
}
.pk-box {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 16px;
  max-width: 95vw;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6);
}
.pk-title { font-size: 14px; font-weight: bold; color: var(--text-muted); margin-bottom: 10px; }
.pk-grid {
  display: grid;
  grid-template-columns: auto repeat(7, 1fr);
  gap: 3px;
  margin-bottom: 10px;
}
.pk-hdr { font-size: 10px; color: var(--text-faint); text-align: center; padding: 2px; }
.pk-root { font-size: 12px; font-weight: bold; color: var(--text-muted); display: flex; align-items: center; padding-right: 4px; }
.pk-cell {
  padding: 5px 3px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-hover);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  min-width: 36px;
}
.pk-cell:hover { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
.pk-cell.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.pk-bass-row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-bottom: 8px; }
.pk-bass-label { font-size: 12px; color: var(--text-muted); margin-right: 4px; }
.pk-bass-btn {
  padding: 3px 8px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--bg-hover);
  color: var(--text-primary); font-size: 12px; cursor: pointer;
}
.pk-bass-btn:hover { border-color: var(--accent); color: var(--accent); }
.pk-bass-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.pk-clear {
  padding: 5px 14px; border-radius: var(--radius-sm); border: none;
  background: #553333; color: #ffaaaa; font-size: 13px; cursor: pointer;
}
.pk-clear:hover { background: #774444; }

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

.sidebar > .sidebar-top-row {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.back-btn {
  padding: 7px 12px;
  font-size: 13px;
  font-weight: bold;
  border-radius: var(--radius);
  border: none;
  background: var(--bg-active);
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
}
.back-btn:hover { background: #555; }
.save-back-btn {
  flex: 1;
  padding: 7px;
  font-size: 13px;
  font-weight: bold;
  border-radius: var(--radius);
  border: none;
  background: #2a6a2a;
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
}
.save-back-btn:hover { background: #3a8a3a; }

.sidebar-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Metadata ── */
.field-label { font-size: 11px; color: var(--text-faint); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
.song-title-row { display: flex; }
.title-input {
  flex: 1;
  padding: 8px 10px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: bold;
}

.meta-row { display: flex; gap: 8px; }
.meta-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.meta-select {
  padding: 6px 8px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 13px;
}
.meta-select option { background: var(--bg-surface); }

/* ── Sections panel ── */
.sections-panel { display: flex; flex-direction: column; gap: 8px; padding-top: 10px; border-top: 1px solid var(--border); }
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.type-selector { display: flex; gap: 4px; flex-wrap: wrap; }
.type-btn {
  flex: 1;
  padding: 5px;
  font-size: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-hover);
  color: var(--text-muted);
  cursor: pointer;
  text-transform: capitalize;
}
.type-btn:hover { background: var(--accent-dim); color: var(--accent); border-color: var(--accent); }

.section-list { display: flex; flex-direction: column; gap: 3px; }
.list-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: var(--radius);
  background: var(--bg-hover);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  gap: 6px;
}
.list-item:hover { background: var(--bg-active); }
.list-item.active { background: var(--accent-dim); color: var(--accent); }
.list-item-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }

.list-item-actions { display: flex; gap: 2px; flex-shrink: 0; }
.move-btn {
  background: none; border: none; color: var(--text-faint);
  font-size: 10px; cursor: pointer; padding: 2px 4px; border-radius: 3px;
}
.move-btn:hover:not(:disabled) { color: var(--text-primary); background: var(--bg-active); }
.move-btn:disabled { opacity: 0.25; cursor: default; }
.delete-btn {
  background: none; border: none; color: var(--text-faint);
  font-size: 13px; cursor: pointer; padding: 2px 4px; border-radius: 3px;
}
.delete-btn:hover { color: var(--danger); background: var(--danger-hover); }

/* ── Sharing ── */
.share-btn { background: #2a6a8a; color: #fff; border: none; border-radius: var(--radius-sm); padding: 5px 12px; font-size: 13px; cursor: pointer; }
.share-btn:hover { background: #3a8aba; }
.sharing-status { font-size: 12px; color: #8ad; }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: var(--bg-surface); color: var(--text-primary); border-radius: var(--radius-lg); padding: 24px 28px; min-width: 280px; max-width: 90vw; box-shadow: 0 8px 40px rgba(0,0,0,0.5); }
.modal h3 { margin: 0 0 14px; }
.modal-actions { display: flex; gap: 10px; margin-top: 16px; }
.share-input { padding: 6px 8px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-input); color: var(--text-primary); font-size: 13px; margin-right: 6px; }
.shared-list { list-style: none; padding: 0; margin: 6px 0; }
.shared-list li { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 13px; }

/* ── Mobile portrait ── */
@media (max-width: 768px) and (orientation: portrait), (max-width: 500px) {
  .editor-layout { flex-direction: column; }
  .main-area { height: 45%; flex: none; flex-shrink: 0; padding: 8px; overflow: hidden; }
  .sidebar { width: 100%; min-width: 0; height: 55%; border-left: none; border-top: 1px solid var(--border-light); }
  .lyrics-bar textarea { max-height: 80px; }
  .pk-box { padding: 10px 6px; }
}
</style>