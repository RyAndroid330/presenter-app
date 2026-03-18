<template>
  <div class="editor-layout">
    <div class="main-area">
      <div
        ref="textInputRef"
        class="text-input"
        contenteditable="true"
        spellcheck="false"
        @input="onTextInput"
      ></div>
      <div class="bottom-bar">
        <button class="save-btn" @click="saveSlide">Save Slide</button>
      </div>
    </div>

    <div class="sidebar">
      <div class="sidebar-top-row">
        <button class="back-btn" @click="goBack">&#x2190; Back</button>
        <button class="save-back-btn" @click="saveAndBack">&#x2714; Save &amp; Back</button>
      </div>

      <label class="field-label">Lesson Name</label>
      <div class="name-row">
        <input v-model="lessonName" @change="updateName" class="name-input" placeholder="Lesson name" />
      </div>

      <!-- Sharing controls -->
      <div class="sharing-section">
        <label class="field-label">Sharing</label>
        <div class="sharing-row">
          <button class="share-btn" @click="openShareModal">Share Lesson</button>
          <span v-if="lessonSharingStatus" class="sharing-status">{{ lessonSharingStatus }}</span>
        </div>
      </div>

      <!-- Share Modal -->
      <div v-if="showShareModal" class="modal-overlay">
        <div class="modal">
          <h3>Share Lesson</h3>
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

      <!-- Slides (above Bible section) -->
      <div class="slides-section">
        <div class="slides-header">
          <span>Slides</span>
          <button class="slide-add-btn" @click="addSlide">+</button>
        </div>
        <div class="slide-list">
          <div
            v-for="(slide, index) in slides"
            :key="index"
            class="slide-item"
            :class="{ active: editingSlideIndex === index, 'slide-animate-in': animatingSlideIndex === index }"
            @click="openSlide(index)"
          >
            <input
              v-if="renamingSlide === index"
              v-model="slideRenameText"
              class="slide-rename-input"
              @click.stop
              @keydown.enter="finishSlideRename(index)"
              @keydown.escape="renamingSlide = null"
              @blur="finishSlideRename(index)"
              ref="slideRenameRef"
            />
            <span v-else class="slide-item-text" @dblclick.stop="startSlideRename(index)">{{ index + 1 }}. {{ slide.substring(0, 30) || '(empty)' }}{{ slide.length > 30 ? '…' : '' }}</span>
            <div class="slide-item-actions">
              <button class="slide-move-btn" :disabled="index === 0" @click.stop="moveSlide(index, -1)">&#x25B2;</button>
              <button class="slide-move-btn" :disabled="index === slides.length - 1" @click.stop="moveSlide(index, 1)">&#x25BC;</button>
              <button class="slide-delete-btn" @click.stop="deleteSlide(index)">&#x2715;</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bible controls (collapsible) -->
      <div class="bible-section">
        <div class="bible-header" @click="bibleOpen = !bibleOpen">
          <span>Bible Insert</span>
          <span class="toggle-arrow">{{ bibleOpen ? '▲' : '▼' }}</span>
        </div>
        <div v-show="bibleOpen" class="controls">
          <label class="field-label">Language</label>
          <select v-model="bibleLang" @change="onBibleLangChange" class="bible-lang-select">
            <option v-if="showAllLangs" value="__show_less__">── Show fewer languages ──</option>
            <option v-for="l in visibleLanguages" :key="l.code" :value="l.code" :disabled="l._sep">{{ l.name }}</option>
            <option v-if="!showAllLangs" value="__show_more__">── Show more languages ──</option>
          </select>

          <select v-model="selectedBible" @change="onBibleChange">
            <option v-for="b in bibles" :key="b.id" :value="b.id">
              {{ b.englishName || b.name }} ({{ b.shortName }})
            </option>
            <option v-if="!bibles.length" disabled>Loading…</option>
          </select>

          <select v-model="selectedBook" @change="onBookChange">
            <option v-for="book in books" :key="book.id" :value="book.id">
              {{ book.name }}
            </option>
            <option v-if="!books.length" disabled>Loading…</option>
          </select>

          <label class="field-label">Chapter</label>
          <div class="chapter-buttons">
            <button
              v-for="ch in chapterCount"
              :key="ch"
              class="chapter-btn"
              :class="{ active: ch === selectedChapter }"
              @click="selectChapter(ch)"
            >{{ ch }}</button>
          </div>

          <label class="field-label">Verses <span class="hint">— tap one verse, or tap two for a range</span></label>
          <div v-if="verseCount > 0" class="verse-label">
            <span v-if="verseStart && verseEnd">Selected: {{ verseStart }}–{{ verseEnd }}</span>
            <span v-else-if="verseStart">Selected: {{ verseStart }}… (tap end verse)</span>
          </div>
          <div class="verse-buttons">
            <button
              v-for="v in verseCount"
              :key="v"
              class="verse-btn"
              :class="{ active: isVerseInRange(v) }"
              @click="selectVerse(v)"
            >{{ v }}</button>
          </div>
          <button v-if="verseStart" @click="insertVerse">Insert Verse</button>
          <button v-if="verseStart" class="clear-btn" @click="clearVerseSelection">Clear</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createFitText } from '../composables/useFitText.js'
import { useLanguagePref } from '../composables/useLanguagePref.js'

// --- Sharing state ---
const showShareModal = ref(false)
const shareToSlides = ref(false)
const shareWithInput = ref('')
const sharedWithList = ref([])
const lessonSharingStatus = ref('')

function openShareModal() {
  showShareModal.value = true
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
  if (!lessonId) return
  try {
    await fetch(`/api/lessons/${lessonId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sharedWith: sharedWithList.value, sharedToSlides: shareToSlides.value })
    })
    lessonSharingStatus.value = shareToSlides.value
      ? 'Shared to Slides (public)'
      : sharedWithList.value.length
        ? `Shared with: ${sharedWithList.value.join(', ')}`
        : 'Private'
    closeShareModal()
  } catch (e) {
    alert('Error saving sharing settings')
  }
}


// Bible data now served from local bible.db via server API

const route = useRoute()
const router = useRouter()
const { langPref, setLang, bibleLangId, biblePref, setBible, recentBibleLangs, addRecentBibleLang } = useLanguagePref()
const lessonId = parseInt(route.query.id)

const textInputRef = ref(null)
const lessonName = ref('')
const slides = ref([])
const editingSlideIndex = ref(null)

const bibles = ref([])
const selectedBible = ref('')
const bibleLang = ref(bibleLangId(langPref.value))  // ISO 639-3 code for bible DB
const bibleLanguages = ref([{code: 'eng', name: 'English', popular: true}])
const showAllLangs = ref(false)
const books = ref([])
const selectedBook = ref('')
const chapterCount = ref(0)
const selectedChapter = ref(1)
const verseCount = ref(0)
const verseStart = ref(null)
const verseEnd = ref(null)
const bibleOpen = ref(false)
const animatingSlideIndex = ref(null)
const savingSlide = ref(false)
const renamingSlide = ref(null)
const slideRenameText = ref('')
const slideRenameRef = ref(null)

const visibleLanguages = computed(() => {
  const all = showAllLangs.value ? bibleLanguages.value : bibleLanguages.value.filter(l => l.popular || l.code === bibleLang.value)
  // Put recently-used languages at the top
  const recent = recentBibleLangs.value
  if (!recent.length) return all
  const recentSet = new Set(recent)
  const top = recent.map(c => all.find(l => l.code === c)).filter(Boolean)
  const rest = all.filter(l => !recentSet.has(l.code))
  return [...top, { code: '__sep_recent__', name: '────────────', _sep: true }, ...rest]
})

let fitText = null

/* --- Navigation --- */
async function goBack() {
  // Delete lesson if still untitled/empty
  if (lessonId && (!lessonName.value.trim() || lessonName.value.trim() === 'Untitled')) {
    try {
      await fetch('/api/lessons/' + lessonId, { method: 'DELETE' })
    } catch (e) { console.error(e) }
  }
  router.push('/teacher')
}

async function saveAndBack() {
  if (!lessonName.value.trim()) {
    alert('Please enter a lesson name before saving.')
    return
  }
  await saveSlidesToDB()
  router.push('/teacher')
}

/* --- Lesson loading --- */
async function loadLesson() {
  if (!lessonId) return
  try {
    const res = await fetch('/api/lessons/' + lessonId)
    const lesson = await res.json()
    lessonName.value = lesson.name
    slides.value = lesson.slides || []
    // --- Sharing fields ---
    shareToSlides.value = !!lesson.sharedToSlides
    sharedWithList.value = Array.isArray(lesson.sharedWith) ? [...lesson.sharedWith] : []
    lessonSharingStatus.value = lesson.sharedToSlides
      ? 'Shared to Slides (public)'
      : sharedWithList.value.length
        ? `Shared with: ${sharedWithList.value.join(', ')}`
        : 'Private'
  } catch (e) {
    console.error('Failed to load lesson', e)
  }
}

async function updateName() {
  if (!lessonId || !lessonName.value.trim()) return
  try {
    await fetch('/api/lessons/' + lessonId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: lessonName.value })
    })
  } catch (e) { console.error(e) }
}

async function saveSlidesToDB() {
  if (!lessonId) return
  try {
    await fetch('/api/lessons/' + lessonId + '/slides', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: slides.value })
    })
  } catch (e) { console.error(e) }
}

/* --- Text Fitting --- */
function onTextInput() {
  if (fitText) fitText.fit(textInputRef.value.innerText)
  if (editingSlideIndex.value !== null) {
    slides.value[editingSlideIndex.value] = textInputRef.value.innerText
  }
}

/* --- Slides --- */
function addSlide() {
  slides.value.push('')
  editingSlideIndex.value = slides.value.length - 1
  textInputRef.value.innerText = ''
  if (fitText) fitText.fit('')
  saveSlidesToDB()
}

function openSlide(index) {
  editingSlideIndex.value = index
  const text = slides.value[index]
  textInputRef.value.innerText = text
  if (fitText) fitText.fit(text)
}

function deleteSlide(index) {
  slides.value.splice(index, 1)
  if (editingSlideIndex.value === index) {
    editingSlideIndex.value = null
    textInputRef.value.innerText = ''
    if (fitText) fitText.fit('')
  } else if (editingSlideIndex.value !== null && editingSlideIndex.value > index) {
    editingSlideIndex.value--
  }
  saveSlidesToDB()
}

function moveSlide(index, dir) {
  const target = index + dir
  if (target < 0 || target >= slides.value.length) return
  const arr = [...slides.value]
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  slides.value = arr
  if (editingSlideIndex.value === index) editingSlideIndex.value = target
  else if (editingSlideIndex.value === target) editingSlideIndex.value = index
  saveSlidesToDB()
}

async function startSlideRename(index) {
  renamingSlide.value = index
  slideRenameText.value = slides.value[index]
  await nextTick()
  if (slideRenameRef.value) {
    const el = Array.isArray(slideRenameRef.value) ? slideRenameRef.value[0] : slideRenameRef.value
    if (el) { el.focus(); el.select() }
  }
}

function finishSlideRename(index) {
  if (renamingSlide.value === null) return
  renamingSlide.value = null
  const text = slideRenameText.value
  slides.value[index] = text
  if (editingSlideIndex.value === index) {
    textInputRef.value.innerText = text
    if (fitText) fitText.fit(text)
  }
  saveSlidesToDB()
}

function saveSlide() {
  const text = textInputRef.value.innerText.trim()
  if (!text || savingSlide.value) return
  savingSlide.value = true

  let targetIdx
  if (editingSlideIndex.value !== null) {
    slides.value[editingSlideIndex.value] = text
    targetIdx = editingSlideIndex.value
  } else {
    slides.value.push(text)
    targetIdx = slides.value.length - 1
  }

  // Trigger shrink animation on the text area
  const el = textInputRef.value
  el.classList.add('shrink-out')

  setTimeout(() => {
    // Highlight the saved slide in the list
    animatingSlideIndex.value = targetIdx

    // Clear text area for next slide
    el.classList.remove('shrink-out')
    el.innerText = ''
    if (fitText) fitText.fit('')
    editingSlideIndex.value = null
    savingSlide.value = false

    saveSlidesToDB()

    // Remove highlight after animation
    setTimeout(() => { animatingSlideIndex.value = null }, 500)
  }, 350)
}

/* --- Bible DB (local) --- */
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
      const saved = biblePref.value;
      if (saved && bibles.value.find(b => b.id === saved)) {
        selectedBible.value = saved;
      } else {
        selectedBible.value = bibles.value[0].id;
      }
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

// Cross-window sync: convert ISO 639-1 pref to ISO 639-3 for bible dropdown
watch(langPref, (code) => {
  const iso3 = bibleLangId(code)
  if (iso3 !== bibleLang.value) {
    bibleLang.value = iso3
    loadBibles()
  }
})

async function loadBooks(bibleId) {
  try {
    const res = await fetch(`https://bible.helloao.org/api/${bibleId}/books.json`);
    const data = await res.json();
    books.value = data.books;
    if (books.value.length) {
      selectedBook.value = books.value[0].id;
      chapterCount.value = books.value[0].numberOfChapters || 0;
      selectedChapter.value = 1;
      clearVerseSelection();
      await loadVerses(bibleId, books.value[0].id, 1);
    }
  } catch (err) { console.error('Error loading books:', err); }
}

function loadChapters(bibleId, bookId) {
  // Chapter count comes from the Book record (numberOfChapters)
  const bookObj = books.value.find(b => b.id === bookId);
  chapterCount.value = bookObj ? bookObj.numberOfChapters : 0;
  selectedChapter.value = 1;
  clearVerseSelection();
  loadVerses(bibleId, bookId, 1);
}

async function loadVerses(bibleId, bookId, chapter) {
  try {
    const res = await fetch(`https://bible.helloao.org/api/${bibleId}/${bookId}/${chapter}.json`);
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
  setBible(selectedBible.value)
  loadBooks(selectedBible.value)
}
function onBookChange() {
  loadChapters(selectedBible.value, selectedBook.value)
}

/* --- Insert Verse --- */
async function insertVerse() {
  if (!verseStart.value) return;
  const bookObj = books.value.find(b => b.id === selectedBook.value);
  if (!bookObj) return;

  const bookName = bookObj.name;
  const startV = verseStart.value;
  const endV = verseEnd.value || startV;
  const verseLabel = endV > startV ? `${startV}-${endV}` : `${startV}`;
  const reference = `${bookName} ${selectedChapter.value}:${verseLabel}`;

  try {
    // Fetch the chapter JSON and extract the verses
    const url = `https://bible.helloao.org/api/${selectedBible.value}/${selectedBook.value}/${selectedChapter.value}.json`;
    const res = await fetch(url);
    const data = await res.json();
    let verseText = '';
    if (data.chapter && Array.isArray(data.chapter.content)) {
      const verses = data.chapter.content.filter(c => c.type === 'verse');
      const startIdx = Math.max(0, startV - 1);
      const endIdx = endV - 1;
      const selectedVerses = verses.slice(startIdx, endIdx + 1);
      verseText = selectedVerses.map(v => v.content.join(' ')).join(' ');
    }
    if (!verseText) {
      alert('Reference not found');
      return;
    }
    const newContent = `${reference}\n\n${verseText}`;
    const existing = textInputRef.value.innerText.trim();
    const finalText = existing ? `${existing}\n\n${newContent}` : newContent;
    textInputRef.value.innerText = finalText;
    if (fitText) fitText.fit(finalText);
  } catch (err) {
    console.error('Verse fetch error:', err);
    alert('Error fetching verse');
  }
}

/* --- Lifecycle --- */
let resizeHandler

onMounted(async () => {
  await loadLesson()
  fitText = createFitText(textInputRef, 40)
  resizeHandler = () => {
    if (textInputRef.value) fitText.fit(textInputRef.value.innerText)
  }
  window.addEventListener('resize', resizeHandler)
  fitText.fit('')
  await loadBibleLanguages()
  // Ensure bibleLang matches a code from the loaded list
  const iso3Init = bibleLangId(langPref.value)
  if (bibleLanguages.value.find(l => l.code === iso3Init)) {
    bibleLang.value = iso3Init
  }
  loadBibles()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler)
  if (fitText) fitText.cleanup()
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

/* Slide text editor */
.text-input {
  flex: 1;
  min-height: 60px;
  background: rgba(255,255,255,0.04);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: 20px;
  text-align: center;
  font-weight: bold;
  font-size: 1.2em;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.2;
  color: var(--text-primary);
  outline: none;
}
.text-input:focus { border-color: var(--accent); }

/* Save bar — always visible */
.bottom-bar {
  flex-shrink: 0;
  padding-top: 10px;
  display: flex;
  gap: 8px;
}
.save-btn {
  flex: 1;
  padding: 10px;
  border-radius: var(--radius);
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
}
.save-btn:hover { background: var(--accent-hover); }

/* ── Right sidebar ── */
.sidebar {
  width: 300px;
  min-width: 200px;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-light);
  background: var(--bg-surface);
  overflow: hidden;
}

/* Sticky action row */
.sidebar-top-row {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.back-btn, .save-back-btn {
  flex: 1;
  padding: 8px;
  font-size: 13px;
  font-weight: bold;
  border-radius: var(--radius);
  border: none;
  cursor: pointer;
  white-space: nowrap;
  color: var(--text-primary);
}
.back-btn { background: var(--bg-active); }
.back-btn:hover { background: #555; }
.save-back-btn { background: #2a6a2a; }
.save-back-btn:hover { background: #3a8a3a; }

/* Scrollable sidebar content */
.sidebar-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Form elements ── */
.field-label { font-size: 11px; color: var(--text-faint); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
.field-label .hint { text-transform: none; font-weight: normal; font-style: italic; letter-spacing: 0; color: var(--text-faint); }

.name-row { display: flex; }
.name-input {
  flex: 1;
  padding: 8px 10px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: bold;
}

select {
  width: 100%;
  padding: 7px 8px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 13px;
}
select option { background: var(--bg-surface); }

/* ── Sharing ── */
.sharing-section { display: flex; flex-direction: column; gap: 6px; }
.sharing-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.share-btn {
  background: #2a6a8a; color: #fff; border: none;
  border-radius: var(--radius-sm); padding: 5px 12px;
  font-size: 13px; cursor: pointer;
}
.share-btn:hover { background: #3a8aba; }
.sharing-status { font-size: 12px; color: #8ad; }

/* ── Slides list ── */
.slides-section { display: flex; flex-direction: column; gap: 6px; padding-top: 10px; border-top: 1px solid var(--border); }
.slides-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-faint);
}
.slide-add-btn {
  width: 26px; height: 26px;
  border-radius: var(--radius-sm); border: none;
  background: var(--bg-active); color: var(--text-primary);
  font-size: 18px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.slide-add-btn:hover { background: #666; }

.slide-list { display: flex; flex-direction: column; gap: 3px; }
.slide-item {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  border-radius: var(--radius);
  background: var(--bg-hover);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}
.slide-item:hover { background: var(--bg-active); }
.slide-item.active { background: var(--accent-dim); color: var(--accent); }
.slide-item-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slide-item-actions { display: flex; gap: 2px; align-items: center; flex-shrink: 0; }

.slide-rename-input {
  flex: 1; padding: 2px 6px; border-radius: 4px;
  border: 1px solid var(--border); background: var(--bg-input);
  color: var(--text-primary); font-size: 13px; outline: none; min-width: 0;
}
.slide-move-btn {
  background: none; border: none; color: var(--text-faint);
  font-size: 10px; cursor: pointer; padding: 2px 4px; border-radius: 3px;
}
.slide-move-btn:hover:not(:disabled) { color: var(--text-primary); background: var(--bg-active); }
.slide-move-btn:disabled { opacity: 0.25; cursor: default; }
.slide-delete-btn {
  background: none; border: none; color: var(--text-faint);
  font-size: 13px; cursor: pointer; padding: 2px 4px; border-radius: 3px;
}
.slide-delete-btn:hover { color: var(--danger); background: var(--danger-hover); }

/* ── Bible section ── */
.bible-section { padding-top: 10px; border-top: 1px solid var(--border); }
.bible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  padding: 4px 0;
  user-select: none;
}
.toggle-arrow { font-size: 10px; }

.controls { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.bible-lang-select { width: 100%; }

.chapter-buttons { display: flex; flex-wrap: wrap; gap: 4px; }
.chapter-btn, .verse-btn {
  border: none; border-radius: var(--radius-sm);
  background: var(--bg-active); color: var(--text-primary);
  cursor: pointer; font-size: 12px; padding: 0;
  display: flex; align-items: center; justify-content: center;
}
.chapter-btn { width: 36px; height: 36px; }
.verse-btn   { width: 32px; height: 32px; }
.chapter-btn.active, .verse-btn.active { background: var(--accent); color: #fff; }

.verse-label { font-size: 12px; color: var(--text-muted); }
.verse-buttons { display: flex; flex-wrap: wrap; gap: 4px; }

button.clear-btn {
  background: #553333; color: #ffaaaa; border: none;
  border-radius: var(--radius); padding: 6px 12px; cursor: pointer; font-size: 13px;
}
button.clear-btn:hover { background: #774444; }

/* ── Animations ── */
.text-input.shrink-out { animation: shrinkOut 0.35s ease-in forwards; }
@keyframes shrinkOut {
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.3) translateY(40px); opacity: 0; }
}
.slide-animate-in { animation: slideFlash 0.5s ease; }
@keyframes slideFlash {
  0%   { background: #3a6a3a; }
  100% { background: var(--bg-hover); }
}

/* ── Modals ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: var(--bg-surface); color: var(--text-primary);
  border-radius: var(--radius-lg); padding: 24px 28px;
  min-width: 280px; max-width: 90vw; box-shadow: 0 8px 40px rgba(0,0,0,0.5);
}
.modal h3 { margin: 0 0 14px; font-size: 16px; }
.modal-actions { display: flex; gap: 10px; margin-top: 16px; }
.share-input {
  padding: 6px 8px; border-radius: var(--radius);
  border: 1px solid var(--border); background: var(--bg-input);
  color: var(--text-primary); font-size: 13px; margin-right: 6px;
}
.shared-list { list-style: none; padding: 0; margin: 6px 0; }
.shared-list li { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 13px; }

/* ── Mobile portrait ── */
@media (max-width: 768px) and (orientation: portrait), (max-width: 500px) {
  .editor-layout { flex-direction: column; }
  .main-area { height: 42%; flex: none; flex-shrink: 0; padding: 8px; overflow: hidden; }
  .sidebar { width: 100%; min-width: 0; height: 58%; border-left: none; border-top: 1px solid var(--border-light); }
  .text-input { padding: 12px; font-size: 1em; }
  .chapter-btn { width: 32px; height: 32px; }
  .verse-btn   { width: 28px; height: 28px; }
}
</style>