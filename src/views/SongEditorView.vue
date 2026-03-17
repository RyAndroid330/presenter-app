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
.editor-layout {
  min-height: 100vh;
  background: #181818;
  color: #e0e0e0;
  font-family: 'Inter', 'Segoe UI', 'Arial', sans-serif;
}
.main-area, .sidebar {
  background: #232323;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  margin: 1em;
  padding: 1.5em;
}
.save-btn, .pk-cell, .pk-bass-btn, .type-btn, .share-btn {
  background: var(--accent-color);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 0.4em 1.2em;
  font-weight: 600;
  cursor: pointer;
  margin: 0.2em;
  transition: background 0.2s;
}
.save-btn:hover, .pk-cell:hover, .pk-bass-btn:hover, .type-btn:hover, .share-btn:hover {
  background: var(--accent-color-hover);
}
.modal, .modal-overlay {
  background: #232323;
  color: #e0e0e0;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.field-label {
  color: var(--accent-color);
}
.list-item.active, .section-header {
  background: #282828;
  color: var(--accent-color);
}
.list-item {
  background: #232323;
  color: #e0e0e0;
  border-radius: 8px;
  margin-bottom: 0.5em;
  padding: 0.5em 1em;
}
.delete-btn {
  background: none;
  color: #e74c3c;
  border: none;
  font-size: 1.1em;
  cursor: pointer;
  border-radius: 8px;
  padding: 0.2em 0.7em;
  transition: background 0.2s, color 0.2s;
}
.delete-btn:hover {
  background: #e74c3c;
  color: #fff;
}

.editor-layout {
  display: flex;
  height: 100dvh;
  width: 100dvw;
  overflow: hidden;
  background-color: #2f2f2f;
  font-family: Arial, sans-serif;
  color: white;
  margin: 0;
  padding: 0;
}

.main-area {
  width: 80dvw;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

.sidebar {
  width: 20dvw;
  height: 100dvh;
  padding: 15px;
  border-left: 1px solid #444;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow-y: auto;
  gap: 12px;
}

.back-btn {
  padding: 10px;
  font-size: 15px;
  font-weight: bold;
  border-radius: 8px;
  border: none;
  background: #444;
  color: white;
  cursor: pointer;
  text-align: center;
}

.back-btn:hover { background: #555; }

.save-back-btn {
  padding: 10px;
  font-size: 15px;
  font-weight: bold;
  border-radius: 8px;
  border: none;
  background: #2a6a2a;
  color: white;
  cursor: pointer;
  text-align: center;
}
.save-back-btn:hover { background: #3a8a3a; }

.song-title-row { display: flex; }

.title-input {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.08);
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.sections-panel {
  border-top: 1px solid #444;
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: bold;
  color: #ccc;
}

.add-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #555;
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.add-btn:hover { background: #777; }

.section-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 8px;
  background: #3a3a3a;
  cursor: pointer;
  font-size: 13px;
  color: #ddd;
}

.list-item:hover { background: #4a4a4a; }
.list-item.active { background: #555; color: white; }

.list-item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  margin-left: 2px;
  border-radius: 4px;
}

.delete-btn:hover { color: #ff6666; background: rgba(255,100,100,0.15); }

.list-item-actions {
  display: flex;
  gap: 2px;
  align-items: center;
  margin-left: 4px;
}

.move-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 10px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}
.move-btn:hover:not(:disabled) { color: #ccc; background: rgba(255,255,255,0.1); }
.move-btn:disabled { opacity: 0.3; cursor: default; }

@media (max-width: 900px) {
  .editor-layout {
    flex-direction: column;
    padding: 10px 2px;
  }
  .sidebar {
    width: 100%;
    min-width: 0;
    border-radius: 0 0 12px 12px;
    margin-bottom: 12px;
  }
  .main-area {
    width: 100%;
    min-width: 0;
    padding: 0 2px;
  }
}

@media (max-width: 600px) {
  .editor-layout {
    flex-direction: column;
    padding: 4px 0;
  }
  .sidebar {
    width: 100vw;
    min-width: 0;
    border-radius: 0 0 8px 8px;
    margin-bottom: 8px;
    padding: 8px 2px;
  }
  .main-area {
    width: 100vw;
    min-width: 0;
    padding: 0 2px;
  }
  .lyrics-bar textarea {
    font-size: 1em;
    min-width: 0;
    width: 98vw;
    max-width: 100vw;
  }
  .pk-box {
    width: 98vw;
    min-width: 0;
    padding: 8px 2px;
  }
}

.type-selector { display: flex; gap: 4px; flex-wrap: wrap; }

.type-btn {
  flex: 1;
  padding: 6px;
  font-size: 12px;
  border-radius: 6px;
  border: none;
  background: #3a5a3a;
  color: #ccc;
  cursor: pointer;
  text-transform: capitalize;
}
.type-btn:hover { background: #4a7a4a; color: white; }

.field-label {
  font-size: 13px;
  color: #aaa;
}

.meta-row {
  display: flex;
  gap: 8px;
}

.meta-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-select {
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.08);
  color: white;
  font-size: 14px;
}

.meta-select option {
  background: #333;
  color: white;
}

/* ---- Chord Editor ---- */
.chord-editor {
  flex: 1;
  overflow-y: auto;
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 20px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 18px;
  line-height: 1;
}

.ce-line { margin-bottom: 14px; white-space: normal; }

.ce-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  width: 1ch;
  vertical-align: top;
  position: relative;
}

.ce-slot {
  display: block;
  height: 1.4em;
  width: 100%;
  position: relative;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.ce-slot.clickable { cursor: pointer; }
.ce-slot.clickable:hover { background: rgba(255,255,255,0.12); border-radius: 2px; }
.ce-slot.filled { border-bottom-color: #4fc3f7; }

.ce-note-hint {
  position: absolute;
  left: 0;
  bottom: 1px;
  font-size: 0.65em;
  color: rgba(255,255,255,0.12);
  pointer-events: none;
}

.ce-chord {
  position: absolute;
  left: 0;
  bottom: 2px;
  white-space: nowrap;
  font-size: 0.7em;
  color: #4fc3f7;
  font-weight: bold;
  pointer-events: none;
  z-index: 1;
}

.ce-char {
  display: block;
  height: 1.3em;
  text-align: center;
  color: #eee;
}

.empty-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 18px;
}

/* ---- Lyrics Bar ---- */
.lyrics-bar {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-shrink: 0;
}

.lyrics-bar textarea {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.08);
  color: white;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  resize: vertical;
}

.save-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: #444;
  color: white;
  font-size: 15px;
  cursor: pointer;
  flex-shrink: 0;
}

.save-btn:hover { background: #555; }

/* ---- Chord Picker ---- */
.pk-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.pk-box {
  background: #3a3a3a;
  border-radius: 16px;
  padding: 20px;
  max-width: 95vw;
  max-height: 90vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pk-title { font-size: 16px; font-weight: bold; text-align: center; }

.pk-grid {
  display: grid;
  grid-template-columns: 40px repeat(12, 1fr);
  gap: 3px;
}

.pk-hdr {
  font-size: 11px;
  color: #999;
  text-align: center;
  padding: 4px 2px;
  font-weight: bold;
}

.pk-root {
  font-size: 14px;
  font-weight: bold;
  color: #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.pk-cell {
  padding: 6px 2px;
  border-radius: 6px;
  border: 1px solid #555;
  background: #444;
  color: #ccc;
  font-size: 11px;
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
}

.pk-cell:hover { background: #555; }

.pk-cell.active {
  background: #4fc3f7;
  color: #222;
  border-color: #4fc3f7;
  font-weight: bold;
}

.pk-bass-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding-top: 6px;
  border-top: 1px solid #555;
}

.pk-bass-label {
  font-size: 13px;
  font-weight: bold;
  color: #aaa;
  margin-right: 4px;
}

.pk-bass-btn {
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid #555;
  background: #444;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
}

.pk-bass-btn:hover { background: #555; }

.pk-bass-btn.active {
  background: #4fc3f7;
  color: #222;
  border-color: #4fc3f7;
  font-weight: bold;
}

.pk-clear {
  align-self: center;
  padding: 8px 24px;
  border-radius: 8px;
  border: none;
  background: #663333;
  color: #ffaaaa;
  font-size: 14px;
  cursor: pointer;
}

.pk-clear:hover { background: #884444; }

/* Mobile layout */
@media (max-width: 768px) {
  .editor-layout {
    flex-direction: column;
    overflow: hidden;
  }
  .main-area {
    width: 100%;
    height: 45dvh;
    min-height: 0;
    padding: 8px;
    overflow-y: auto;
  }
  .sidebar {
    width: 100%;
    height: 55dvh;
    border-left: none;
    border-top: 1px solid #444;
    padding: 10px;
    gap: 8px;
  }
  .chord-editor {
    font-size: 14px;
    padding: 10px;
  }
  .pk-grid {
    grid-template-columns: 32px repeat(6, 1fr);
    gap: 2px;
  }
  .pk-cell {
    font-size: 10px;
    padding: 5px 1px;
  }
  .pk-hdr {
    font-size: 9px;
  }
  .pk-root {
    font-size: 12px;
  }
  .pk-box {
    padding: 12px;
    max-width: 95vw;
  }
  .lyrics-bar {
    flex-direction: column;
  }
  .lyrics-bar textarea {
    font-size: 13px;
  }
}
</style>
