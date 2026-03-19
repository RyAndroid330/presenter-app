<template>
  <div class="presenter-layout">
    <div class="presenter-area">
      <div ref="textInputRef" class="text-display"></div>
    </div>
    <div class="right-sidebar">
      <div class="sidebar-icons sidebar-top">
        <button :class="{active: openPanel==='main'}" @click="togglePanel('main')" title="Main Tools">
          <span class="icon material-icons">dashboard_customize</span>
        </button>
        <button :class="{active: openPanel==='quickadd'}" @click="togglePanel('quickadd')" title="Quick Add">
          <span class="icon material-icons">add_circle</span>
        </button>
        <button :class="{active: openPanel==='songs'}" @click="togglePanel('songs')" title="Songs">
          <span class="icon material-icons">music_note</span>
        </button>
        <button :class="{active: openPanel==='bible'}" @click="togglePanel('bible')" title="Bible Verse">
          <span class="icon material-icons">menu_book</span>
        </button>
        <button :class="{active: openPanel==='timer'}" @click="togglePanel('timer')" title="Timer Tool">
          <span class="icon material-icons">timer</span>
        </button>
        <button class="back-btn" @click="$router.push('/')" title="Home">
          <span class="icon material-icons">arrow_back</span>
        </button>
      </div>
      <div class="sidebar-panels">
        <div v-show="openPanel==='main'" class="sidebar-panel">
          <!-- Main Presenter Tools: Meeting, Lesson, Session -->
          <div class="panel">
            <div class="section-header"><span>Meeting</span></div>
            <input v-model="meetingName" @change="ensureMeeting" class="meeting-input" placeholder="Meeting name" />
            <div v-if="meetings.length" class="meeting-list">
              <div
                v-for="m in meetings"
                :key="m.id"
                class="meeting-item"
                :class="{ active: meetingName === m.name }"
                @click="selectMeeting(m.name)"
              >
                <span class="meeting-item-text">{{ m.name }}</span>
                <button class="meeting-delete-btn" @click.stop="deleteMeeting(m.id)">&#x2715;</button>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="section-header"><span>Lesson</span></div>
            <select v-model="selectedLessonId" @change="onLessonChange" class="panel-select">
              <option :value="null">— select lesson —</option>
              <option v-for="l in lessons" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
            <div v-if="lessonSlides.length" class="slide-list">
              <div
                v-for="(slide, index) in lessonSlides"
                :key="'l'+index"
                class="slide-item"
                :class="{ active: activeType === 'lesson' && activeIdx === index }"
                @click="presentLessonSlide(index)"
              >
                <span class="slide-item-text">{{ index + 1 }}. {{ slide.substring(0, 35) || '(empty)' }}{{ slide.length > 35 ? '…' : '' }}</span>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="section-header"><span>Session</span></div>
            <select v-model="selectedSessionId" @change="onSessionChange" class="panel-select">
              <option :value="null">— select session —</option>
              <option v-for="s in sessions" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <div v-if="sessionSongs.length" class="session-songs">
              <div
                v-for="(song, si) in sessionSongs"
                :key="si"
                class="session-song"
              >
                <div class="ss-title" @click="toggleExpandSong(song.song_id)"
                  :class="{ active: expandedSongId === song.song_id }">
                  {{ si + 1 }}. {{ song.title }}
                </div>
                <div v-if="expandedSongId === song.song_id && expandedSections.length" class="ss-sections">
                  <div
                    v-for="(sec, idx) in expandedSections"
                    :key="idx"
                    class="ss-section"
                    :class="{ active: activeType === 'section' && activeSongId === song.song_id && activeIdx === idx }"
                    @click="presentSection(song.song_id, idx, sec)"
                  >
                    <strong>{{ sec.type }}</strong>
                    <span class="ss-preview">{{ sec.text.substring(0, 40) || '(empty)' }}{{ sec.text.length > 40 ? '…' : '' }}</span>
                  </div>
                </div>
                <div v-if="expandedSongId === song.song_id && !expandedSections.length" class="ss-sections">
                  <div class="ss-section" style="color:#888;font-style:italic;">No sections found</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-show="openPanel==='quickadd'" class="sidebar-panel">
          <!-- Quick Add Panel -->
          <div class="section-header"><span>Quick Add</span></div>
          <div class="quick-add-block bible-selector-group">
            <textarea v-model="quickSlideText" class="quick-add-text" placeholder="Type extra slide text..."></textarea>
            <button @click="presentQuickSlide" class="quick-add-btn">Present Slide</button>
          </div>
        </div>
        <div v-show="openPanel==='songs'" class="sidebar-panel">
          <!-- Songs Panel -->
          <div class="section-header"><span>Songs</span></div>
          <div class="quick-add-block">
            <label style="font-size:12px; color:#aaa; margin-bottom:2px;">Language:</label>
            <select v-model="selectedXmlLang" class="quick-add-select" @change="onXmlLangChange">
              <option v-for="lang in xmlLangs" :key="lang.code" :value="lang.code">{{ lang.name || lang.code }}</option>
            </select>
            <input v-model="quickSongSearch" class="quick-add-text" placeholder="Search songs..." />
            <div style="position:relative;">
              <select v-model="quickSongId" class="quick-add-select" @change="onQuickSongChange" size="8" style="height:auto; overflow-y:auto;" @scroll.passive="onSongDropdownScroll">
                <option :value="null">— select song —</option>
                <option v-for="song in filteredQuickSongs" :key="song.id || song.filename" :value="song.id || song.filename">{{ song.title }}</option>
              </select>
              <div v-if="xmlSongsHasMore && filteredQuickSongs.length" style="position:absolute;bottom:2px;right:8px;font-size:11px;color:#888;">Scroll for more…</div>
            </div>
            <button @click="presentQuickSong" :disabled="!quickSongId" class="quick-add-btn">Present Whole Song</button>
          </div>
          <div v-if="quickSongSections.length" class="quick-add-block">
            <div class="section-header"><span>Song Sections</span></div>
            <div class="slide-list">
              <div v-for="(sec, idx) in quickSongSections" :key="idx" class="slide-item" @click="presentQuickSongSection(idx, sec)">
                <strong>{{ sec.type }}</strong>
                <span class="slide-item-text">{{ sec.text.substring(0, 35) || '(empty)' }}{{ sec.text.length > 35 ? '…' : '' }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-show="openPanel==='bible'" class="sidebar-panel">
          <!-- Bible Verse Panel -->
          <div class="section-header"><span>Bible Verse</span></div>
          <div class="quick-add-block">
            <label class="field-label bible-selector-margin">Language</label>
            <select v-model="bibleLang" @change="onBibleLangChange" class="bible-lang-select bible-selector-margin">
              <option v-if="showAllLangs" value="__show_less__">── Show fewer languages ──</option>
              <option v-for="l in visibleLanguages" :key="l.code" :value="l.code" :disabled="l._sep">{{ l.name }}</option>
              <option v-if="!showAllLangs" value="__show_more__">── Show more languages ──</option>
            </select>
            <select class="bible-version-select bible-selector-margin" v-model="selectedBible" @change="onBibleChange">
              <option v-for="b in bibles" :key="b.id" :value="b.id">
                {{ b.englishName || b.name }} ({{ b.shortName }})
              </option>
              <option v-if="!bibles.length" disabled>Loading…</option>
            </select>
            <select v-model="selectedBook" @change="onBookChange" class="bible-selector-margin">
              <option v-for="book in books" :key="book.id" :value="book.id">
                {{ book.name }}
              </option>
              <option v-if="!books.length" disabled>Loading…</option>
            </select>
            <label class="field-label bible-selector-margin">Chapter</label>
            <div class="chapter-buttons bible-grid">
              <button
                v-for="ch in chapterCount"
                :key="ch"
                class="chapter-btn"
                :class="{ active: ch === selectedChapter }"
                @click="selectChapter(ch)"
              >{{ ch }}</button>
            </div>
            <label class="field-label bible-selector-margin">Verses <span class="hint">— tap one verse, or tap two for a range</span></label>
            <div v-if="verseCount > 0" class="verse-label">
              <span v-if="verseStart && verseEnd">Selected: {{ verseStart }}–{{ verseEnd }}</span>
              <span v-else-if="verseStart">Selected: {{ verseStart }}… (tap end verse)</span>
            </div>
            <div class="verse-buttons bible-grid">
              <button
                v-for="v in verseCount"
                :key="v"
                class="verse-btn"
                :class="{ active: isVerseInRange(v) }"
                @click="selectVerse(v)"
              >{{ v }}</button>
            </div>
            <button v-if="verseStart" @click="presentBibleVerse" class="quick-add-btn">Present Verse</button>
            <button v-if="verseStart" class="clear-btn" @click="clearVerseSelection">Clear</button>
          </div>
        </div>
        <div v-show="openPanel==='timer'" class="sidebar-panel">
          <!-- Timer Tool Panel -->
          <div class="section-header"><span>Timer Tool</span></div>
          <form class="time-slide-form" @submit.prevent="startTimer">
            <div>
              <input v-model="timerMsg" class="time-slide-input" placeholder="Timer message" />
              <div class="time-slide-inputs">
                <input v-model.number="timerMin" type="number" min="0" class="time-slide-num" placeholder="min" />
                <label style="font-size:12px;color:#aaa;">Min</label>
                <input v-model.number="timerSec" type="number" min="0" max="59" class="time-slide-num" placeholder="sec" />
                <label style="font-size:12px;color:#aaa;">Sec</label>
              </div>
              <button type="submit" class="time-slide-send" :disabled="timerRunning">Start</button>
            </div>
          </form>
          <div v-if="timerRunning || timerDisplay">
            <div style="margin-bottom: 6px;">
              <strong>{{ timerMsgDisplay }}</strong>
              <span v-if="timerDisplay"> {{ timerDisplay }}</span>
            </div>
            <button class="time-slide-btn" @click="pauseTimer" v-if="timerRunning">Pause</button>
            <button class="time-slide-btn" @click="resumeTimer" v-if="!timerRunning && timerRemaining > 0">Resume</button>
            <button class="time-slide-btn" @click="resetTimer">Reset</button>
          </div>
        </div>
        <div v-show="openPanel" class="sidebar-panel clear-panel">
          <button class="clear-btn" @click="clearSlide">Blank Slide</button>
        </div>
      </div>

    </div> <!-- end .presenter-layout -->
  </div>
  </template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { createFitText } from '../composables/useFitText.js'

// --- Sidebar panel state ---
const openPanel = ref('main')
function togglePanel(panel) {
  openPanel.value = openPanel.value === panel ? null : panel
  // Optionally focus first input in panel
  nextTick(() => {
    const el = document.querySelector('.sidebar-panel[style*="display: block"] input, .sidebar-panel[style*="display: block"] textarea')
    if (el) el.focus()
  })
}

// --- Quick Add Panel ---
const quickSlideText = ref('')
const quickSongId = ref(null)
const allSongs = ref([]) // DB songs
const xmlSongs = ref([]) // XML songs for selected language
const xmlLangs = ref([])
const selectedXmlLang = ref('en')
const xmlSongsPage = ref(0)
const xmlSongsPageSize = 40
const xmlSongsHasMore = ref(true)
const quickSongSections = ref([])
const quickSongSearch = ref('')
const filteredQuickSongs = computed(() => {
  let songs = [...allSongs.value, ...xmlSongs.value]
  if (!quickSongSearch.value.trim()) return songs
  const q = quickSongSearch.value.trim().toLowerCase()
  return songs.filter(s => s.title.toLowerCase().includes(q))
})

// --- Advanced Bible Selector State ---
import { useLanguagePref } from '../composables/useLanguagePref.js'
const { langPref, setLang, bibleLangId, biblePref, setBible, recentBibleLangs, addRecentBibleLang } = useLanguagePref()

const bibles = ref([])
const selectedBible = ref('')
const bibleLang = ref(bibleLangId(langPref.value))
const bibleLanguages = ref([{code: 'eng', name: 'English', popular: true}])
const showAllLangs = ref(false)
const books = ref([])
const selectedBook = ref('')
const chapterCount = ref(0)
const selectedChapter = ref(1)
const verseCount = ref(0)
const verseStart = ref(null)
const verseEnd = ref(null)

const visibleLanguages = computed(() => {
  const all = showAllLangs.value ? bibleLanguages.value : bibleLanguages.value.filter(l => l.popular || l.code === bibleLang.value)
  const recent = recentBibleLangs.value
  if (!recent.length) return all
  const recentSet = new Set(recent)
  const top = recent.map(c => all.find(l => l.code === c)).filter(Boolean)
  const rest = all.filter(l => !recentSet.has(l.code))
  return [...top, { code: '__sep_recent__', name: '────────────', _sep: true }, ...rest]
})

let prevBibleLang = bibleLang.value
function onBibleLangChange() {
  if (bibleLang.value === '__show_more__') {
    showAllLangs.value = true
    bibleLang.value = prevBibleLang
    return
  }
  if (bibleLang.value === '__show_less__') {
    showAllLangs.value = false
    bibleLang.value = prevBibleLang
    return
  }
  prevBibleLang = bibleLang.value
  addRecentBibleLang(bibleLang.value)
  loadBibles()
}


// --- Bible API (helloao.org) integration ---
const BIBLE_API = 'https://bible.helloao.org/v1';

async function loadBibleLanguages() {
  try {
    const res = await fetch('https://bible.helloao.org/api/available_translations.json');
    const data = await res.json();
    // Remove duplicates by language code and sort alphabetically
    const langMap = new Map();
    for (const t of data.translations) {
      if (!langMap.has(t.language)) {
        langMap.set(t.language, {
          code: t.language,
          name: t.languageName || t.languageEnglishName || t.language,
          popular: t.language === 'eng',
        });
      }
    }
    bibleLanguages.value = Array.from(langMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) { console.error(e); }
}

async function loadBibles() {
  try {
    const res = await fetch('https://bible.helloao.org/api/available_translations.json');
    const data = await res.json();
    // Filter bibles by selected language
    const filtered = data.translations.filter(t => t.language === bibleLang.value);
    bibles.value = filtered;
    if (bibles.value.length) {
      selectedBible.value = bibles.value[0].id;
      await loadBooks(selectedBible.value);
    } else {
      bibles.value = [];
      selectedBible.value = '';
      books.value = [];
      chapterCount.value = 0;
      verseCount.value = 0;
    }
  } catch (err) { console.error('Error loading bibles:', err); }
}

async function loadBooks(datasetSlug) {
  try {
    const res = await fetch(`https://bible.helloao.org/api/${datasetSlug}/books.json`);
    const data = await res.json();
    books.value = data.books;
    if (books.value.length) {
      selectedBook.value = books.value[0].id;
      await loadChapters(datasetSlug, selectedBook.value);
    }
  } catch (err) { console.error('Error loading books:', err); }
}

async function loadChapters(datasetSlug, bookSlug) {
  try {
    // Get book info to determine chapter count
    const res = await fetch(`https://bible.helloao.org/api/${datasetSlug}/books.json`);
    const data = await res.json();
    const book = data.books.find(b => b.id === bookSlug);
    chapterCount.value = book ? book.numberOfChapters : 0;
    selectedChapter.value = 1;
    clearVerseSelection();
    await loadVerses(datasetSlug, bookSlug, 1);
  } catch (err) { console.error('Error loading chapters:', err); }
}

async function loadVerses(datasetSlug, bookSlug, chapter) {
  try {
    const res = await fetch(`https://bible.helloao.org/api/${datasetSlug}/${bookSlug}/${chapter}.json`);
    const data = await res.json();
    verseCount.value = data.numberOfVerses || (data.chapter && data.chapter.content.filter(c => c.type === 'verse').length) || 0;
  } catch (err) {
    console.error('Error loading verses:', err);
    verseCount.value = 0;
  }
}

function selectChapter(ch) {
  selectedChapter.value = ch
  clearVerseSelection()
  loadVerses(selectedBible.value, selectedBook.value, ch)
}

function selectVerse(v) {
  if (!verseStart.value) {
    verseStart.value = v
    verseEnd.value = null
  } else if (!verseEnd.value) {
    if (v < verseStart.value) {
      verseEnd.value = verseStart.value
      verseStart.value = v
    } else {
      verseEnd.value = v
    }
  } else {
    verseStart.value = v
    verseEnd.value = null
  }
}

function isVerseInRange(v) {
  if (!verseStart.value) return false
  if (!verseEnd.value) return v === verseStart.value
  return v >= verseStart.value && v <= verseEnd.value
}

function clearVerseSelection() {
  verseStart.value = null
  verseEnd.value = null
}

function onBibleChange() {
  loadBooks(selectedBible.value);
}
function onBookChange() {
  loadChapters(selectedBible.value, selectedBook.value);
}

// --- Present Bible Verse (advanced) ---

async function presentBibleVerse() {
  if (!verseStart.value) return;
  const bookObj = books.value.find(b => b.id === selectedBook.value);
  if (!bookObj) return;
  const bookName = bookObj.name;
  let verseText = '';
  try {
    // Fetch the chapter JSON and extract the verses
    const url = `https://bible.helloao.org/api/${selectedBible.value}/${selectedBook.value}/${selectedChapter.value}.json`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.chapter && Array.isArray(data.chapter.content)) {
      const verses = data.chapter.content.filter(c => c.type === 'verse');
      const startIdx = Math.max(0, verseStart.value - 1);
      const endIdx = verseEnd.value ? verseEnd.value - 1 : startIdx;
      const selectedVerses = verses.slice(startIdx, endIdx + 1);
      verseText = selectedVerses.map(v => v.content.join(' ')).join(' ');
    }
  } catch (e) { verseText = ''; }
  const ref = `${bookName} ${selectedChapter.value}:${verseStart.value}${verseEnd.value ? '–' + verseEnd.value : ''}`;
  const display = verseText ? `${ref}\n${verseText}` : ref;
  textInputRef.value.innerText = display;
  if (fitText) fitText.fit(display);
  broadcast(display);
}

onMounted(() => {
  loadBibleLanguages();
  loadBibles();
})

async function loadAllSongs() {
  try {
    // Load DB songs
    const res = await fetch('/api/songs')
    allSongs.value = await res.json()
    // Load XML languages
    const langsRes = await fetch('/api/song-library/languages')
    let langs = await langsRes.json()
    langs = langs.sort((a, b) => (a.code === 'en' ? -1 : b.code === 'en' ? 1 : 0))
    xmlLangs.value = langs
    selectedXmlLang.value = langs.find(l => l.code === 'en') ? 'en' : langs[0]?.code || ''
    await loadXmlSongs(true)
  } catch (e) { console.error(e) }
}

async function loadXmlSongs(reset = false) {
  if (reset) {
    xmlSongs.value = []
    xmlSongsPage.value = 0
    xmlSongsHasMore.value = true
  }
  if (!selectedXmlLang.value || !xmlSongsHasMore.value) return
  try {
    const res = await fetch(`/api/song-library/${selectedXmlLang.value}`)
    let list = await res.json()
    // Pagination: only show a page at a time
    const start = xmlSongsPage.value * xmlSongsPageSize
    const end = start + xmlSongsPageSize
    const page = list.slice(start, end).map(x => ({ ...x, language: selectedXmlLang.value }))
    if (reset) xmlSongs.value = page
    else xmlSongs.value = [...xmlSongs.value, ...page]
    if (end >= list.length) xmlSongsHasMore.value = false
    else xmlSongsPage.value++
  } catch (e) { console.error(e) }
}

function onXmlLangChange() {
  loadXmlSongs(true)
}

function onSongDropdownScroll(e) {
  const el = e.target
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10 && xmlSongsHasMore.value) {
    loadXmlSongs(false)
  }
}


/**
 * Shared helper: fetch a full song (with sections) given a song_id.
 * Works for both DB songs (numeric id) and XML library songs (filename string).
 * Uses the already-loaded allSongs + xmlSongs lists to resolve language/filename,
 * so no extra round-trips are needed as long as loadAllSongs() has run (which it
 * does on mount). Falls back to a direct /api/songs/:id call just in case.
 */
async function fetchSongWithSections(songId) {
  let song = null

  // 1. Try DB song — /api/songs/:id returns the full record including sections
  try {
    const res = await fetch('/api/songs/' + songId)
    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      const data = await res.json()
      // Make sure it actually has sections (not just a 404 wrapped in JSON)
      if (data && (data.sections || data.id)) song = data
    }
  } catch {}

  // 2. Try XML library — look up language/filename from the already-loaded lists
  if (!song || !song.sections || !song.sections.length) {
    let xml = null
    // Check allSongs (DB list — may have language/filename for imported XML songs)
    if (Array.isArray(allSongs.value)) {
      xml = allSongs.value.find(x => String(x.id) === String(songId) || x.filename === songId)
    }
    // Check xmlSongs (currently loaded XML language page)
    if (!xml && Array.isArray(xmlSongs.value)) {
      xml = xmlSongs.value.find(x => String(x.id) === String(songId) || x.filename === songId)
    }
    if (xml && xml.language && xml.filename) {
      try {
        const res = await fetch(`/api/song-library/${xml.language}/${xml.filename}`)
        if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
          song = await res.json()
        }
      } catch {}
    }
  }

  if (!song || !song.sections) return null

  // Normalise chords field
  return {
    ...song,
    sections: song.sections.map(s => ({
      ...s,
      chords: s.chords
        ? (typeof s.chords === 'string' ? JSON.parse(s.chords) : s.chords)
        : {}
    }))
  }
}

async function onQuickSongChange() {
  quickSongSections.value = []
  if (!quickSongId.value) return
  const song = await fetchSongWithSections(quickSongId.value)
  if (song) quickSongSections.value = song.sections
}

function presentQuickSongSection(idx, section) {
  if (!section) return
  textInputRef.value.innerText = section.text
  if (fitText) fitText.fit(section.text)
  broadcast(section.text, section.chords || {})
}

function presentQuickSlide() {
  if (!quickSlideText.value.trim()) return
  textInputRef.value.innerText = quickSlideText.value.trim()
  if (fitText) fitText.fit(quickSlideText.value.trim())
  broadcast(quickSlideText.value.trim())
  quickSlideText.value = ''
}

async function presentQuickSong() {
  if (!quickSongId.value) return
  try {
    const res = await fetch('/api/songs/' + quickSongId.value)
    const song = await res.json()
    let text = song.title
    if (song.sections && song.sections.length) {
      text += '\n' + song.sections.map(s => s.text).join('\n')
    }
    textInputRef.value.innerText = text
    if (fitText) fitText.fit(text)
    broadcast(text)
  } catch (e) { console.error(e) }
}

// --- Timer Tool ---
const timerMsg = ref('Break ends in')
const timerMin = ref(0)
const timerSec = ref(0)
const timerRunning = ref(false)
const timerEnd = ref(null)
const timerRemaining = ref(0)
const timerDisplay = ref('')
const timerMsgDisplay = ref('')
let timerInterval = null



function updateTimerDisplay() {
  let rem = timerRemaining.value
  if (rem < 0) rem = 0
  const min = Math.floor(rem / 60)
  const sec = rem % 60
  timerDisplay.value = (min > 0 ? min + ':' : '') + sec.toString().padStart(2, '0')
  timerMsgDisplay.value = timerMsg.value.trim()
}


function startTimer() {
  if ((timerMin.value === 0 && timerSec.value === 0) || !timerMsg.value.trim()) {
    alert('Enter a message and time')
    return
  }
  timerRunning.value = true
  timerRemaining.value = timerMin.value * 60 + timerSec.value
  timerEnd.value = Date.now() + timerRemaining.value * 1000
  updateTimerDisplay()
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(tickTimer, 1000)
  // Immediately broadcast the first tick
  tickTimer()
}


function tickTimer() {
  if (!timerRunning.value) return
  timerRemaining.value = Math.max(0, Math.round((timerEnd.value - Date.now()) / 1000))
  updateTimerDisplay()
  // Always broadcast timer text as a slide update every tick
  if (timerMsg.value.trim()) {
    const timerText = timerMsg.value.trim() + ' ' + timerDisplay.value
    textInputRef.value.innerText = timerText
    if (fitText) fitText.fit(timerText)
    broadcast(timerText)
  }
  if (timerRemaining.value <= 0) {
    timerRunning.value = false
    clearInterval(timerInterval)
  }
}


function pauseTimer() {
  if (!timerRunning.value) return
  timerRunning.value = false
  clearInterval(timerInterval)
  timerInterval = null
  timerRemaining.value = Math.max(0, Math.round((timerEnd.value - Date.now()) / 1000))
  updateTimerDisplay()
}


function resumeTimer() {
  if (timerRunning.value || timerRemaining.value <= 0) return
  timerRunning.value = true
  timerEnd.value = Date.now() + timerRemaining.value * 1000
  updateTimerDisplay()
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(tickTimer, 1000)
  // Immediately broadcast the resumed tick
  tickTimer()
}


function resetTimer() {
  timerRunning.value = false
  clearInterval(timerInterval)
  timerInterval = null
  timerRemaining.value = 0
  timerDisplay.value = ''
  timerMsgDisplay.value = ''
  // Optionally clear the slide
  textInputRef.value.innerText = ''
  if (fitText) fitText.fit('')
  broadcast('')
}


const router = useRouter()
const textInputRef = ref(null)
const meetingName = ref('')
const meetings = ref([])
let fitText = null

/* --- Active state --- */
const activeType = ref(null)   // 'lesson' | 'section'
const activeIdx = ref(null)
const activeSongId = ref(null)

/* --- Lessons --- */
const lessons = ref([])
const selectedLessonId = ref(null)
const lessonSlides = ref([])

/* --- Sessions --- */
const sessions = ref([])
const selectedSessionId = ref(null)
const sessionSongs = ref([])
const expandedSongId = ref(null)
const expandedSections = ref([])

/* --- Meeting --- */
async function loadMeetings() {
  try {
    const res = await fetch('/api/meetings')
    meetings.value = await res.json()
  } catch (e) { console.error(e) }
}

async function ensureMeeting() {
  if (!meetingName.value.trim()) return
  await fetch('/api/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: meetingName.value })
  })
  await loadMeetings()
}

function selectMeeting(name) {
  meetingName.value = name
}

async function deleteMeeting(id) {
  if (!confirm('Delete this meeting?')) return
  try {
    await fetch('/api/meetings/' + id, { method: 'DELETE' })
    await loadMeetings()
  } catch (e) { console.error(e) }
}

async function broadcast(text, chords) {
  if (!meetingName.value.trim()) {
    alert('Enter a meeting name first')
    return
  }
  await ensureMeeting()
  await fetch('/api/presenter?meet=' + encodeURIComponent(meetingName.value), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, chords: chords || null })
  })
}

/* --- Lessons --- */
async function loadLessons() {
  try {
    const res = await fetch('/api/lessons')
    lessons.value = await res.json()
  } catch (e) { console.error(e) }
}

async function onLessonChange() {
  lessonSlides.value = []
  if (!selectedLessonId.value) return
  try {
    const res = await fetch('/api/lessons/' + selectedLessonId.value)
    const lesson = await res.json()
    lessonSlides.value = lesson.slides || []
  } catch (e) { console.error(e) }
}

function presentLessonSlide(index) {
  const text = lessonSlides.value[index]
  activeType.value = 'lesson'
  activeIdx.value = index
  activeSongId.value = null
  textInputRef.value.innerText = text
  if (fitText) fitText.fit(text)
  broadcast(text)
}

/* --- Sessions --- */
async function loadSessions() {
  try {
    const res = await fetch('/api/setlists')
    sessions.value = await res.json()
  } catch (e) { console.error(e) }
}

async function onSessionChange() {
  expandedSongId.value = null
  expandedSections.value = []
  sessionSongs.value = []
  if (!selectedSessionId.value) return
  try {
    const res = await fetch('/api/setlists/' + selectedSessionId.value)
    const s = await res.json()
    sessionSongs.value = s.songs || []
  } catch (e) { console.error(e) }
}

async function toggleExpandSong(songId) {
  // Collapse if already expanded
  if (expandedSongId.value === songId) {
    expandedSongId.value = null
    expandedSections.value = []
    return
  }

  expandedSongId.value = songId
  expandedSections.value = []

  const song = await fetchSongWithSections(songId)

  // Guard: user may have clicked another song while this was loading
  if (expandedSongId.value !== songId) return

  if (song && song.sections && song.sections.length) {
    expandedSections.value = song.sections
  } else {
    console.warn('[toggleExpandSong] No sections found for song_id:', songId)
    expandedSections.value = []
  }
}

function presentSection(songId, idx, section) {
  activeType.value = 'section'
  activeIdx.value = idx
  activeSongId.value = songId
  const text = section.text
  textInputRef.value.innerText = text
  if (fitText) fitText.fit(text)
  broadcast(text, section.chords || {})
}

function clearSlide() {
  activeType.value = null
  activeIdx.value = null
  activeSongId.value = null
  textInputRef.value.innerText = ''
  if (fitText) fitText.fit('')
  if (meetingName.value.trim()) broadcast('')
}

/* --- Lifecycle --- */
let resizeHandler

onMounted(async () => {
  fitText = createFitText(textInputRef, 40)
  resizeHandler = () => {
    if (textInputRef.value) fitText.fit(textInputRef.value.innerText)
  }
  window.addEventListener('resize', resizeHandler)
  fitText.fit('')
  loadMeetings()
  loadLessons()
  loadSessions()
  loadAllSongs()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler)
  if (fitText) fitText.cleanup()
})



</script>

<style scoped>
/* ── Layout ── */
.presenter-layout {
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-raised);
  color: var(--text-primary);
  font-family: inherit;
}

.presenter-area {
  flex: 1 1 0;
  min-width: 0;
  width: 75dvw;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow: hidden;
}

.text-display {
  width: 100%;
  flex: 1;
  background: rgba(255,255,255,0.04);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-weight: bold;
  font-size: clamp(14px, 3vw, 52px);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.15;
  color: var(--text-primary);
  overflow: hidden;
  padding: 16px;
}

/* ── Right sidebar: icon strip + fly-out panel ── */
.right-sidebar {
  flex: 0 0 52px;
  min-width: 0;
  width: 25dvw;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  z-index: 20;
}

/* Vertical icon strip */
.sidebar-icons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 0;
  width: 52px;
  height: 100%;
  overflow: hidden;
}

.sidebar-icons button {
  background: none;
  border: none;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
  flex-shrink: 0;
}
.sidebar-icons button:hover { background: var(--bg-hover); color: var(--text-primary); }
.sidebar-icons button.active { background: var(--accent-dim); color: var(--accent); }
.icon { font-size: 22px; }

/* Panel flies LEFT over the presenter area */
.sidebar-panels {
  position: absolute;
  top: 0;
  right: 52px;
  width: 300px;
  height: 100%;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  box-shadow: -4px 0 20px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  z-index: 21;
}

.sidebar-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 14px 12px 10px;
  overflow-y: auto;
  overflow-x: hidden;
  gap: 12px;
}

.clear-panel {
  height: auto;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  margin-top: auto;
  background: none;
}

/* ── Panel content styles ── */
.panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.panel:first-child { border-top: none; padding-top: 0; }

.section-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: 2px;
}

/* Inputs */
.meeting-input, .panel-select, .quick-add-text,
.quick-add-select, .search-input, .lang-select, .bible-lang-select {
  width: 100%;
  padding: 7px 9px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
}
.quick-add-text { resize: vertical; min-height: 60px; }
select option { background: var(--bg-surface); }

.quick-add-block { display: flex; flex-direction: column; gap: 6px; }
.quick-add-btn {
  padding: 8px;
  border-radius: var(--radius);
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
}
.quick-add-btn:hover { background: var(--accent-hover); }
.quick-add-btn:disabled { opacity: 0.4; cursor: default; }

/* Meeting list */
.meeting-list { display: flex; flex-direction: column; gap: 3px; }
.meeting-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: var(--radius);
  background: var(--bg-hover);
  cursor: pointer;
  font-size: 13px;
}
.meeting-item:hover { background: var(--bg-active); }
.meeting-item.active { background: var(--accent-dim); color: var(--accent); }
.meeting-item-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meeting-delete-btn { background: none; border: none; color: var(--text-faint); font-size: 12px; padding: 2px 4px; cursor: pointer; border-radius: 3px; }
.meeting-delete-btn:hover { color: var(--danger); background: var(--danger-hover); }

/* Slide / session lists */
.slide-list, .session-songs { display: flex; flex-direction: column; gap: 3px; }
.slide-item, .ss-title {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  border-radius: var(--radius);
  background: var(--bg-hover);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}
.slide-item:hover, .ss-title:hover { background: var(--bg-active); }
.slide-item.active, .ss-title.active { background: var(--accent-dim); color: var(--accent); }
.slide-item-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ss-title { font-weight: 600; font-size: 13px; }
.ss-sections { display: flex; flex-direction: column; gap: 2px; padding-left: 10px; margin-top: 2px; }
.ss-section {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  cursor: pointer;
  font-size: 12px;
}
.ss-section:hover { background: var(--bg-hover); }
.ss-section.active { background: var(--accent-dim); }
.ss-section strong { color: var(--accent); font-size: 11px; }
.ss-preview { color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Timer */
.time-slide-form { display: flex; flex-direction: column; gap: 6px; }
.time-slide-inputs { display: flex; gap: 6px; align-items: center; }
.time-slide-input { flex: 1; }
.time-slide-num { width: 52px; text-align: right; }
.time-slide-send {
  padding: 8px;
  border-radius: var(--radius);
  border: none;
  background: #43a047;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  font-size: 13px;
}
.time-slide-send:hover { background: #2e7031; }
.time-slide-send:disabled { opacity: 0.4; cursor: default; }
.time-slide-btn {
  width: 100%;
  padding: 7px;
  border-radius: var(--radius);
  border: none;
  background: var(--bg-active);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  margin-top: 4px;
}
.time-slide-btn:hover { background: #555; }

/* Blank slide / clear */
.clear-btn {
  width: 100%;
  padding: 9px;
  border-radius: var(--radius);
  border: none;
  background: #553333;
  color: #ffaaaa;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
}
.clear-btn:hover { background: #774444; }

/* Bible */
.bible-selector-group { display: flex; flex-direction: column; gap: 8px; }
.field-label { font-size: 11px; color: var(--text-faint); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.field-label .hint { text-transform: none; font-weight: normal; letter-spacing: 0; }

.bible-grid { display: flex; flex-wrap: wrap; gap: 4px; }
.chapter-btn, .verse-btn {
  border: none; border-radius: var(--radius-sm);
  background: var(--bg-active); color: var(--text-primary);
  cursor: pointer; font-size: 12px; padding: 0;
  display: flex; align-items: center; justify-content: center;
}
.chapter-btn { width: 34px; height: 34px; }
.verse-btn   { width: 30px; height: 30px; }
.chapter-btn.active, .verse-btn.active { background: var(--accent); color: #fff; }
.verse-label { font-size: 12px; color: var(--text-muted); }
.bible-version-select { width: 100%; }
.bible-selector-margin { margin-bottom: 4px; }

/* ── Mobile portrait ── */
@media (max-width: 768px) and (orientation: portrait), (max-width: 500px) {
  .presenter-layout { flex-direction: column; }
  .presenter-area { height: 42%; flex: none; flex-shrink: 0; padding: 8px; overflow: hidden; }
  .text-display { font-size: clamp(14px, 5vw, 32px); padding: 10px; border-radius: var(--radius); }

  .right-sidebar {
    width: 100%;
    height: 58%;
    flex-shrink: 0;
    flex-direction: column-reverse;
    border-left: none;
    border-top: 1px solid var(--border);
  }
  .sidebar-icons {
    width: 100%;
    height: 48px;
    flex-direction: row;
    justify-content: space-around;
    padding: 0 8px;
    gap: 0;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .sidebar-panels {
    position: relative;
    right: unset;
    top: unset;
    width: 100%;
    height: unset;
    flex: 1;
    min-height: 0;
    box-shadow: none;
    border-right: none;
  }
  .sidebar-panel { padding: 8px 10px; gap: 8px; }
  .clear-panel { margin-top: 0; border-top: none; }
}
</style>