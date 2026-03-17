import { ref, onMounted, onUnmounted } from 'vue'

const STORAGE_KEY = 'presenterAppLang'
const BIBLE_KEY = 'presenterAppBible'
const RECENT_SONG_LANGS_KEY = 'presenterRecentSongLangs'
const RECENT_BIBLE_LANGS_KEY = 'presenterRecentBibleLangs'
const MAX_RECENT = 5

/* ISO 639-1 → ISO 639-3 mapping for the Bible API */
const ISO1_TO_ISO3 = {
  af: 'afr', am: 'amh', ar: 'arb', az: 'aze', be: 'bel', bg: 'bul',
  bn: 'ben', bs: 'bos', ca: 'cat', cs: 'ces', cy: 'cym', da: 'dan',
  de: 'deu', el: 'ell', en: 'eng', es: 'spa', et: 'est', eu: 'eus',
  fa: 'fas', fi: 'fin', fr: 'fra', ga: 'gle', gl: 'glg', gu: 'guj',
  ha: 'hau', he: 'heb', hi: 'hin', hr: 'hrv', hu: 'hun', hy: 'hye',
  id: 'ind', ig: 'ibo', is: 'isl', it: 'ita', ja: 'jpn', ka: 'kat',
  kk: 'kaz', km: 'khm', kn: 'kan', ko: 'kor', ku: 'kur', ky: 'kir',
  la: 'lat', lo: 'lao', lt: 'lit', lv: 'lav', mg: 'mlg', mk: 'mkd',
  ml: 'mal', mn: 'mon', mr: 'mar', ms: 'msa', mt: 'mlt', my: 'mya',
  ne: 'nep', nl: 'nld', no: 'nor', ny: 'nya', or: 'ori', pa: 'pan',
  pl: 'pol', pt: 'por', ro: 'ron', ru: 'rus', rw: 'kin', si: 'sin',
  sk: 'slk', sl: 'slv', sn: 'sna', so: 'som', sq: 'sqi', sr: 'srp',
  st: 'sot', su: 'sun', sv: 'swe', sw: 'swa', ta: 'tam', te: 'tel',
  tg: 'tgk', th: 'tha', tl: 'tgl', tr: 'tur', uk: 'ukr', ur: 'urd',
  uz: 'uzb', vi: 'vie', xh: 'xho', yo: 'yor', zh: 'zho', zu: 'zul'
}

/**
 * Shared reactive language preference backed by localStorage.
 * Changes propagate across browser tabs/windows via the storage event.
 *
 * @returns {{ langPref: Ref<string>, setLang: (code: string) => void, bibleLangId: (code?: string) => string }}
 */
export function useLanguagePref() {
  const langPref = ref(localStorage.getItem(STORAGE_KEY) || 'en')
  const biblePref = ref(localStorage.getItem(BIBLE_KEY) || '')

  function setLang(code) {
    if (!code) return
    langPref.value = code
    localStorage.setItem(STORAGE_KEY, code)
  }

  function setBible(id) {
    if (!id) return
    biblePref.value = id
    localStorage.setItem(BIBLE_KEY, id)
  }

  /** Map our ISO 639-1 code to the Bible API's ISO 639-3 code */
  function bibleLangId(code) {
    const c = code || langPref.value
    // Handle codes like 'pt-BR' → try 'pt' first
    const base = c.split('-')[0].toLowerCase()
    return ISO1_TO_ISO3[base] || 'eng'
  }

  // Cross-window sync via storage event
  function onStorage(e) {
    if (e.key === STORAGE_KEY && e.newValue) {
      langPref.value = e.newValue
    }
    if (e.key === BIBLE_KEY && e.newValue) {
      biblePref.value = e.newValue
    }
  }

  onMounted(() => window.addEventListener('storage', onStorage))
  onUnmounted(() => window.removeEventListener('storage', onStorage))

  /* --- Recently-used language helpers --- */
  const recentSongLangs = ref(_loadRecent(RECENT_SONG_LANGS_KEY))
  const recentBibleLangs = ref(_loadRecent(RECENT_BIBLE_LANGS_KEY))

  function addRecentSongLang(code) {
    if (!code) return
    recentSongLangs.value = _pushRecent(RECENT_SONG_LANGS_KEY, code)
  }
  function addRecentBibleLang(code) {
    if (!code) return
    recentBibleLangs.value = _pushRecent(RECENT_BIBLE_LANGS_KEY, code)
  }

  return {
    langPref, setLang, bibleLangId, biblePref, setBible,
    recentSongLangs, recentBibleLangs, addRecentSongLang, addRecentBibleLang,
  }
}

/* --- Helpers (outside composable so they don't need lifecycle) --- */
function _loadRecent(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}
function _pushRecent(key, code) {
  const list = _loadRecent(key).filter(c => c !== code)
  list.unshift(code)
  if (list.length > MAX_RECENT) list.length = MAX_RECENT
  localStorage.setItem(key, JSON.stringify(list))
  return list
}
