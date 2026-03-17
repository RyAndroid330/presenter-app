<template>
  <div class="presenter-layout">
    <div class="presenter-area">
      <div ref="textInputRef" class="text-display"></div>
    </div>
    <div class="right-sidebar">
      <div class="sidebar-icons">
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


async function onQuickSongChange() {
  quickSongSections.value = []
  if (!quickSongId.value) return
  // Try DB song first
  let song = null
  try {
    const res = await fetch('/api/songs/' + quickSongId.value)
    if (res.ok) song = await res.json()
  } catch {}
  // If not found, try XML song
  if (!song) {
    // Find the selected XML song object
    const xml = xmlSongs.value.find(x => x.id === quickSongId.value || x.filename === quickSongId.value)
    if (xml) {
      try {
        const res = await fetch(`/api/song-library/${xml.language}/${xml.filename}`)
        if (res.ok) song = await res.json()
      } catch {}
    }
  }
  if (song && song.sections) {
    quickSongSections.value = (song.sections || []).map(s => ({
      ...s,
      chords: s.chords ? (typeof s.chords === 'string' ? JSON.parse(s.chords) : s.chords) : {}
    }))
  }
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
    // Enrich sessionSongs with XML metadata if available
    sessionSongs.value = (s.songs || []).map(song => {
      // Try to find a matching XML song by id or filename
      let xml = null;
      if (Array.isArray(allSongs?.value)) {
        xml = allSongs.value.find(x => x.id === song.song_id || x.filename === song.song_id)
      }
      if (!xml && Array.isArray(xmlSongs?.value)) {
        xml = xmlSongs.value.find(x => x.id === song.song_id || x.filename === song.song_id)
      }
      if (xml && xml.language && xml.filename) {
        return { ...song, language: xml.language, filename: xml.filename };
      }
      return song;
    })
  } catch (e) { console.error(e) }
}

async function toggleExpandSong(songId) {
  if (expandedSongId.value === songId) {
    expandedSongId.value = null
    expandedSections.value = []
    return
  }
  try {
    console.log('[toggleExpandSong] songId:', songId)
    let song = null;
    // Try DB song first
    try {
      const res = await fetch('/api/songs/' + songId)
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        song = await res.json()
      }
    } catch {}
    // If not found, try XML song fallback (same as quick song tool)
    if (!song) {
      // Try to find the XML song object from xmlSongs (like quick song tool)
      let xml = null;
      if (Array.isArray(xmlSongs?.value)) {
        xml = xmlSongs.value.find(x => x.id == songId || x.filename == songId)
      }
      if (!xml && Array.isArray(allSongs?.value)) {
        xml = allSongs.value.find(x => x.id == songId || x.filename == songId)
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
    if (song && song.sections) {
      expandedSongId.value = songId
      expandedSections.value = (song.sections || []).map(s => ({
        ...s,
        chords: s.chords ? (typeof s.chords === 'string' ? JSON.parse(s.chords) : s.chords) : {}
      }))
    } else {
      console.warn('[toggleExpandSong] No sections found for song:', songId, song)
      expandedSongId.value = songId
      expandedSections.value = []
    }
  } catch (e) {
    console.error('[toggleExpandSong] Error:', e)
    alert('Could not load song data. (Network or parsing error)')
    expandedSongId.value = songId
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
<style>
.presenter-layout {
  min-height: 100vh;
  background: #181818;
  color: #e0e0e0;
  font-family: 'Inter', 'Segoe UI', 'Arial', sans-serif;
}
.presenter-area, .right-sidebar {
  background: #232323;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  margin: 1em;
  padding: 1.5em;
}
.sidebar-icons button, .back-btn {
  background: none;
  color: var(--accent-color);
  border: none;
  font-size: 1.1em;
  cursor: pointer;
  border-radius: 16px;
  padding: 0.5em 1.2em;
  transition: background 0.2s, color 0.2s;
}
.sidebar-icons button.active, .sidebar-icons button:hover, .back-btn:hover {
  background: var(--accent-color);
  color: #181818;
}
.meeting-input, .panel-select, .quick-add-text, .quick-add-select, .search-input, .lang-select, .bible-lang-select {
  background: #222;
  color: #e0e0e0;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 0.4em 0.8em;
}
.meeting-list, .slide-list, .session-songs, .item-list {
  background: #232323;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1em;
}
.meeting-item.active, .slide-item.active, .session-song.active, .ss-section.active {
  background: #282828;
  color: var(--accent-color);
}
.meeting-delete-btn, .edit-btn, .delete-btn, .slide-delete-btn, .slide-move-btn, .add-btn {
  background: none;
  color: #e74c3c;
  border: none;
  font-size: 1.1em;
  cursor: pointer;
  border-radius: 8px;
  padding: 0.2em 0.7em;
  transition: background 0.2s, color 0.2s;
}
.meeting-delete-btn:hover, .edit-btn:hover, .delete-btn:hover, .slide-delete-btn:hover, .slide-move-btn:hover, .add-btn:hover {
  background: #e74c3c;
  color: #fff;
}

.presenter-layout {
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

.presenter-area {
  width: 80dvw;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

.text-display {
  width: 100%;
  flex: 1;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  font-weight: bold;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.1;
  color: white;
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
}

.time-slide-btn {
  width: 100%;
  margin: 8px;
  padding: 8px 0;
  background: #4fc3f7;
  color: #222;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}
.time-slide-btn:hover {
  background: #039be5;
  color: #fff;
}
.time-slide-form {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.time-slide-input {
  flex: 2;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #888;
  margin: 8px;
}
.time-slide-num {
  width: 40px;
  padding: 4px 4px;
  border-radius: 4px;
  border: 1px solid #888;
  text-align: right;
}
.time-slide-send {
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  background: #43a047;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
  margin: 8px;
}

.time-slide-send:hover {
  background: #2e7031;
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

.panel {
  border-top: 1px solid #444;
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-header {
  font-size: 14px;
  font-weight: bold;
  color: #ccc;
}

.meeting-input {
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.08);
  color: white;
  font-size: 15px;
  font-weight: bold;
}

.panel-select {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: #444;
  color: white;
  font-size: 13px;
}

select, button {
  padding: 6px;
  border-radius: 8px;
  border: none;
  background: #444;
  color: white;
  cursor: pointer;
  font-size: 14px;
}
select option { background: #444; color: white; }
select:hover, button:hover { background: #555; }

.slide-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
}

.slide-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 8px;
  background: #3a3a3a;
  cursor: pointer;
  font-size: 13px;
  color: #ddd;
}
.slide-item:hover { background: #4a4a4a; }
.slide-item.active { background: #555; color: white; border-left: 3px solid #4fc3f7; }

.slide-item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-songs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

.ss-title {
  padding: 6px 8px;
  border-radius: 8px;
  background: #3a3a3a;
  cursor: pointer;
  font-size: 13px;
  color: #ddd;
  font-weight: bold;
}
.ss-title:hover { background: #4a4a4a; }
.ss-title.active { background: #555; color: white; }

.ss-sections {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 12px;
  margin-top: 2px;
}

.ss-section {
  padding: 5px 8px;
  border-radius: 6px;
  background: #333;
  cursor: pointer;
  font-size: 12px;
  color: #ccc;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ss-section:hover { background: #444; }
.ss-section.active {
  background: #4a4a4a;
  border-left: 3px solid #4fc3f7;
}
.ss-section strong {
  text-transform: capitalize;
  color: #4fc3f7;
  font-size: 11px;
}
.ss-preview {
  color: #aaa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clear-btn {
  padding: 10px;
  font-size: 14px;
  font-weight: bold;
  border-radius: 8px;
  border: none;
  background: #553333;
  color: #ffaaaa;
  cursor: pointer;
  text-align: center;
  margin-top: auto;
}
.clear-btn:hover { background: #774444; }

.meeting-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
}

.meeting-item {
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
.meeting-item:hover { background: #4a4a4a; }
.meeting-item.active { background: #555; color: white; border-left: 3px solid #4fc3f7; }

.meeting-item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meeting-delete-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 12px;
  padding: 2px 4px;
  cursor: pointer;
  border-radius: 4px;
}
.meeting-delete-btn:hover { color: #ff6666; background: rgba(255,100,100,0.15); }

@media (max-width: 768px) {
  .presenter-layout {
    flex-direction: column;
    overflow: hidden;
  }
  .presenter-area {
    width: 100%;
    height: 45dvh;
    min-height: 0;
    padding: 8px;
  }
  .sidebar {
    width: 100%;
    height: 55dvh;
    border-left: none;
    border-top: 1px solid #444;
    padding: 10px;
    gap: 8px;
  }
  .text-display {
    border-radius: 8px;
    padding: 10px;
  }
  .clear-btn {
    margin-top: 6px;
  }
}
/* Sidebar styles */
.right-sidebar {
  position: relative;
  width: 64px;
  min-width: 64px;
  max-width: 340px;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background: #232323;
  box-shadow: -2px 0 8px rgba(0,0,0,0.08);
  z-index: 10;
  transition: width 0.2s cubic-bezier(.4,0,.2,1);
}
.right-sidebar .sidebar-icons {
  position: absolute;
  left: 0;
  top: 0;
  height: 100dvh;
  width: 64px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 0;
  align-items: center;
  z-index: 12;
  background: #232323;
  box-shadow: -2px 0 8px rgba(0,0,0,0.08);
}
.right-sidebar .sidebar-icons button {
  background: none;
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 26px;
  margin: 0 auto;
}
.right-sidebar .sidebar-icons button.active,
.right-sidebar .sidebar-icons button:hover {
  background: #444;
}
.right-sidebar .icon {
  font-size: 28px;
  color: #ccc;
}
.right-sidebar .sidebar-panels {
  position: absolute;
  top: 0;
  left: 64px;
 
  width: 340px;
  background: #232323;
  box-shadow: -2px 0 8px rgba(0,0,0,0.10);
  display: flex;
  flex-direction: column;
  z-index: 11;
}
.right-sidebar .sidebar-panel {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 0;
  padding: 24px 18px 18px 18px;
  overflow: hidden;
}
.right-sidebar .clear-panel {
  padding-top: 0;
  background: none;
  box-shadow: none;
}
@media (max-width: 700px) {
  .right-sidebar .sidebar-panels {
    width: 95vw;
    right: 56px;
  }
}
.time-slide-inputs{
  display: flex;
  gap: 6px;
  margin-left: 6px;
}
.bible-version-select {
  width: 80%;
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: #444;
  color: white;
  font-size: 13px;
}
/* Bible selector group for spacing */
.bible-selector-group > * {
  margin-bottom: 10px;
}
.bible-selector-group > *:last-child {
  margin-bottom: 0;
}
.bible-selector-margin {
  margin-left: 4px;
  margin-right: 4px;
  margin-top: 2px;
  margin-bottom: 6px;
}
/* Uniform number button sizing for chapters/verses and grid layout */
.bible-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 340px;
}
.chapter-btn,
.verse-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: none;
  background: #444;
  color: white;
  cursor: pointer;
  font-size: 15px;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.chapter-btn.active,
.verse-btn.active {
  background: #777;
}
.clear-panel{
height: 75px;
margin: 8px;
}
<style>
.presenter-layout {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  width: 100vw;
  box-sizing: border-box;
}
.presenter-area {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #181818;
  padding: 2em 1em;
  box-sizing: border-box;
}
.text-display {
  width: 100%;
  max-width: 900px;
  min-height: 300px;
  background: #232323;
  color: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  font-size: 2.2em;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.5em 1em;
  box-sizing: border-box;
  word-break: break-word;
  white-space: pre-wrap;
}
.right-sidebar {
  width: 340px;
  min-width: 220px;
  background: #232323;
  color: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 8px rgba(0,0,0,0.08);
  z-index: 2;
  box-sizing: border-box;
}
.sidebar-icons {
  display: flex;
  flex-direction: row;
  gap: 0.5em;
  padding: 0.7em 0.7em 0.7em 0.7em;
  background: #232323;
  border-bottom: 1px solid #333;
  flex-wrap: wrap;
}
.sidebar-icons button {
  background: none;
  border: none;
  color: #fff;
  font-size: 1.3em;
  border-radius: 10px;
  padding: 0.5em 0.7em;
  cursor: pointer;
  transition: background 0.15s;
}
.sidebar-icons button.active, .sidebar-icons button:hover {
  background: var(--accent-color);
  color: #181818;
}
.sidebar-panels {
  flex: 1 1 0;
  overflow-y: auto;
  padding: 1em 0.7em;
  box-sizing: border-box;
}
.sidebar-panel {
  margin-bottom: 1.5em;
}
.panel {
  background: #232323;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1em;
  margin-bottom: 1em;
}
.section-header {
  font-size: 1.1em;
  font-weight: 600;
  margin-bottom: 0.7em;
}
.meeting-input, .panel-select, .quick-add-text, .bible-lang-select, .bible-version-select, .bible-selector-margin {
  width: 100%;
  margin-bottom: 0.7em;
  font-size: 1em;
  padding: 0.4em 0.7em;
  border-radius: 8px;
  border: 1px solid #333;
  background: #222;
  color: #e0e0e0;
  box-sizing: border-box;
}
.slide-list, .session-songs {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}
.slide-item, .session-song {
  background: #292929;
  border-radius: 8px;
  padding: 0.7em 1em;
  cursor: pointer;
  font-size: 1em;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.slide-item.active, .session-song.active, .slide-item:hover, .session-song:hover {
  background: #333;
}
.quick-add-block {
  margin-bottom: 1em;
}
.quick-add-btn, .time-slide-btn, .meeting-delete-btn, .clear-btn {
  background: var(--accent-color);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.4em 1.2em;
  font-size: 1em;
  cursor: pointer;
  margin-top: 0.5em;
  transition: background 0.15s;
}
.quick-add-btn:disabled {
  background: #444;
  color: #aaa;
  cursor: not-allowed;
}
.quick-add-btn:hover, .time-slide-btn:hover, .meeting-delete-btn:hover, .clear-btn:hover {
  background: var(--accent-color-hover);
}
.bible-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3em;
}
.chapter-btn, .verse-btn {
  background: #292929;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.3em 0.7em;
  font-size: 1em;
  cursor: pointer;
  margin-bottom: 0.2em;
  transition: background 0.15s;
}
.chapter-btn.active, .verse-btn.active, .chapter-btn:hover, .verse-btn:hover {
  background: var(--accent-color);
  color: #181818;
}
.field-label {
  font-size: 0.97em;
  color: #aaa;
  margin-bottom: 0.2em;
}
.bible-selector-margin {
  margin-bottom: 0.5em;
}
.ss-title {
  font-weight: 600;
  cursor: pointer;
}
.ss-sections {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}
.ss-section {
  background: #232323;
  border-radius: 6px;
  padding: 0.4em 0.7em;
  margin-bottom: 0.3em;
  cursor: pointer;
  font-size: 0.97em;
  transition: background 0.15s;
}
.ss-section.active, .ss-section:hover {
  background: #333;
}
.clear-panel {
  margin-top: 2em;
  text-align: center;
}

@media (max-width: 900px) {
  .presenter-layout {
    flex-direction: column;
  }
  .presenter-area {
    padding: 1em 0.5em;
  }
  .right-sidebar {
    width: 100vw;
    min-width: 0;
    box-shadow: none;
    border-left: none;
    border-top: 1px solid #333;
    flex-direction: row;
    padding: 0;
  }
  .sidebar-panels {
    padding: 0.7em 0.2em;
  }
}

@media (max-width: 600px) {
  .presenter-layout {
    flex-direction: column;
    min-height: 100vh;
  }
  .presenter-area {
    padding: 0.5em 0.1em;
  }
  .text-display {
    font-size: 1.1em;
    padding: 0.7em 0.2em;
    border-radius: 8px;
    min-height: 120px;
    max-width: 98vw;
  }
  .right-sidebar {
    width: 100vw;
    min-width: 0;
    box-shadow: none;
    border-left: none;
    border-top: 1px solid #333;
    flex-direction: column;
    padding: 0;
  }
  .sidebar-icons {
    gap: 0.2em;
    padding: 0.3em 0.2em;
    font-size: 1em;
  }
  .sidebar-icons button {
    font-size: 1em;
    padding: 0.3em 0.4em;
    border-radius: 7px;
  }
  .sidebar-panels {
    padding: 0.3em 0.1em;
  }
  .panel {
    padding: 0.5em;
    border-radius: 7px;
  }
}

@media (max-width: 400px) {
  .text-display {
    font-size: 0.9em;
    padding: 0.3em 0.05em;
    border-radius: 4px;
    min-height: 60px;
  }
  .panel {
    padding: 0.2em;
    border-radius: 4px;
  }
}
</style>