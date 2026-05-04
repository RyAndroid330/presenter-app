const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./db");
const songxml = require("./songxml");
const bibledb = require("./archive/bibledb");



const app = express();
app.set('trust proxy', 1);
const PORT = 3000;

// Force HTTPS in production (for Render.com and similar hosts)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}

app.use(express.json());
// List songs, optionally filter by language
app.get("/api/songs", (req, res) => {
  const lang = req.query.lang;
  let songs = db.listSongs();
  if (lang) {
    songs = songs.filter(s => s.language === lang);
  }
  res.json(songs);
});

// Session middleware
require('dotenv').config();
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Passport.js middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport user serialization
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  // Here you can associate the Google account with a user record in your DB
  return done(null, profile);
}));

// Auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/login',
  session: true
}), (req, res) => {
  // Redirect to Vite dev server in development, or / in production
  if (process.env.NODE_ENV !== 'production') {
    return res.redirect('http://localhost:5173');
  }
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});

/* -----------------------
  LIVE MEETING STATE (in-memory for SSE)
----------------------- */
let liveMeetings = {};
// liveMeetings[name] = { text, clients: [], timer: null, timerEnd: null, timerTemplate: null }

/* -----------------------
   API: LIST SAVED MEETINGS
----------------------- */
app.get("/api/meetings", (req, res) => {
  const meetings = db.listMeetings();
  res.json(meetings);
});

/* -----------------------
   API: CREATE / ENSURE MEETING
----------------------- */
app.post("/api/meetings", (req, res) => {
  const name = req.body.name;
  if (!name) return res.status(400).json({ error: "Missing meeting name" });
  const meeting = db.createMeeting(name);
  // ensure live state
  if (!liveMeetings[name]) liveMeetings[name] = { text: "Welcome", clients: [] };
  res.json(meeting);
});

/* -----------------------
   API: DELETE MEETING
   API: CREATE SONG
----------------------- */
app.post("/api/songs", (req, res) => {
  const title = req.body.title;
  if (!title) return res.status(400).json({ error: "Missing song title" });
  const song = db.createSong(title, req.body.language, req.body.key);
  res.json(song);
});

/* -----------------------
   API: GET SINGLE SONG (with sections)
----------------------- */
app.get("/api/songs/:id", (req, res) => {
  const song = db.getSong(parseInt(req.params.id));
  if (!song) return res.status(404).json({ error: "Song not found" });
  res.json(song);
});

/* -----------------------
   API: UPDATE SONG
----------------------- */
app.patch("/api/songs/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const title = req.body.title;
  if (!title) return res.status(400).json({ error: "Missing title" });
  db.updateSong(id, title, req.body.language, req.body.key);
  res.json({ status: "ok" });
});

/* -----------------------
   API: DELETE SONG
----------------------- */
app.delete("/api/songs/:id", (req, res) => {
  db.deleteSong(parseInt(req.params.id));
  res.json({ status: "ok" });
});

/* -----------------------
   API: SAVE SONG SECTIONS (+ write XML)
----------------------- */
app.put("/api/songs/:id/sections", (req, res) => {
  const id = parseInt(req.params.id);
  const sections = req.body.sections || [];
  const saved = db.saveSongSections(id, sections);
  // Also write XML file
  try {
    const song = db.getSong(id);
    if (song) songxml.writeSongFile(song);
  } catch (e) { console.error("XML write error", e); }
  buildSongIndex();
  res.json(saved);
});

/* -----------------------
   API: LOCAL BIBLE DB
----------------------- */
app.get("/api/bible/languages", (req, res) => {
  res.json(bibledb.listLanguages());
});

app.get("/api/bible/translations", (req, res) => {
  const lang = req.query.lang;
  if (!lang) return res.status(400).json({ error: "Missing lang" });
  res.json(bibledb.listTranslations(lang));
});

app.get("/api/bible/books", (req, res) => {
  const tid = req.query.translation;
  if (!tid) return res.status(400).json({ error: "Missing translation" });
  res.json(bibledb.listBooks(tid));
});

app.get("/api/bible/chapters", (req, res) => {
  const { translation, book } = req.query;
  if (!translation || !book)
    return res.status(400).json({ error: "Missing translation or book" });
  res.json({ count: bibledb.getChapterCount(translation, book) });
});

app.get("/api/bible/verses", (req, res) => {
  const { translation, book, chapter } = req.query;
  if (!translation || !book || !chapter)
    return res.status(400).json({ error: "Missing params" });
  res.json({ count: bibledb.getVerseCount(translation, book, Number(chapter)) });
});

app.get("/api/bible/text", (req, res) => {
  const { translation, book, chapter, start, end } = req.query;
  if (!translation || !book || !chapter || !start)
    return res.status(400).json({ error: "Missing params" });
  const endV = end || start;
  const verses = bibledb.getVerses(
    translation,
    book,
    Number(chapter),
    Number(start),
    Number(endV)
  );
  res.json(verses);
});

/* -----------------------
   API: BIBLE BOOK SEARCH
   Fuzzy-matches a spoken book name to a Book row in the DB.
----------------------- */
app.get("/api/bible/book-search", (req, res) => {
  const { translation, name } = req.query;
  if (!translation || !name) return res.status(400).json({ error: "Missing translation or name" });
  const books = bibledb.listBooks(translation);
  const q = name.toLowerCase().replace(/^(first|second|third|1st|2nd|3rd)\s+/i, (m) => {
    const map = { first: '1 ', '1st': '1 ', second: '2 ', '2nd': '2 ', third: '3 ', '3rd': '3 ' };
    return map[m.trim().toLowerCase()] || m;
  });
  const match =
    books.find(b => (b.commonName || b.name).toLowerCase() === q) ||
    books.find(b => (b.commonName || b.name).toLowerCase().startsWith(q)) ||
    books.find(b => (b.commonName || b.name).toLowerCase().includes(q));
  if (!match) return res.status(404).json({ error: "Book not found", name });
  res.json(match);
});

/* -----------------------
   LOCAL BIBLE REFERENCE PARSER
   Converts spoken transcripts to { hasBibleRef, book, chapter, verse, endVerse }
   without any external API dependency.
----------------------- */
const SPOKEN_NUMS = {
  zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,
  ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
  seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,
  sixty:60,seventy:70,eighty:80,ninety:90,hundred:100,
};
const ORDINAL_PREFIX = { first:'1',second:'2',third:'3','1st':'1','2nd':'2','3rd':'3' };
const BOOK_ALIASES = {
  // Old Testament
  'genesis':'genesis','gen':'genesis',
  'exodus':'exodus','exo':'exodus','exod':'exodus',
  'leviticus':'leviticus','lev':'leviticus',
  'numbers':'numbers','num':'numbers',
  'deuteronomy':'deuteronomy','deut':'deuteronomy','deu':'deuteronomy',
  'joshua':'joshua','josh':'joshua',
  'judges':'judges','judg':'judges',
  'ruth':'ruth',
  '1 samuel':'1 samuel','first samuel':'1 samuel','1sam':'1 samuel',
  '2 samuel':'2 samuel','second samuel':'2 samuel','2sam':'2 samuel',
  '1 kings':'1 kings','first kings':'1 kings',
  '2 kings':'2 kings','second kings':'2 kings',
  '1 chronicles':'1 chronicles','first chronicles':'1 chronicles','1 chron':'1 chronicles',
  '2 chronicles':'2 chronicles','second chronicles':'2 chronicles','2 chron':'2 chronicles',
  'ezra':'ezra',
  'nehemiah':'nehemiah','neh':'nehemiah',
  'esther':'esther','esth':'esther',
  'job':'job',
  'psalms':'psalms','psalm':'psalms','psa':'psalms',
  'proverbs':'proverbs','prov':'proverbs',
  'ecclesiastes':'ecclesiastes','ecc':'ecclesiastes','eccl':'ecclesiastes',
  // Song of Solomon: map to 'song' so startsWith('song') matches 'Song of Solomon' or 'Song of Songs' in DB
  'song of solomon':'song','song of songs':'song','songs':'song','sos':'song','song':'song',
  'isaiah':'isaiah','isa':'isaiah',
  'jeremiah':'jeremiah','jer':'jeremiah',
  'lamentations':'lamentations','lam':'lamentations',
  'ezekiel':'ezekiel','eze':'ezekiel','ezek':'ezekiel',
  'daniel':'daniel','dan':'daniel',
  'hosea':'hosea',
  'joel':'joel',
  'amos':'amos',
  'obadiah':'obadiah',
  'jonah':'jonah',
  'micah':'micah',
  'nahum':'nahum',
  'habakkuk':'habakkuk','hab':'habakkuk',
  'zephaniah':'zephaniah','zeph':'zephaniah',
  'haggai':'haggai','hag':'haggai',
  'zechariah':'zechariah','zech':'zechariah',
  'malachi':'malachi','mal':'malachi',
  // New Testament
  'matthew':'matthew','matt':'matthew',
  'mark':'mark',
  'luke':'luke',
  'john':'john',
  'acts':'acts',
  'romans':'romans','rom':'romans',
  '1 corinthians':'1 corinthians','first corinthians':'1 corinthians','1 cor':'1 corinthians','1cor':'1 corinthians',
  '2 corinthians':'2 corinthians','second corinthians':'2 corinthians','2 cor':'2 corinthians','2cor':'2 corinthians',
  'galatians':'galatians','gal':'galatians',
  'ephesians':'ephesians','eph':'ephesians',
  'philippians':'philippians','phil':'philippians',
  'colossians':'colossians','col':'colossians',
  '1 thessalonians':'1 thessalonians','first thessalonians':'1 thessalonians','1 thess':'1 thessalonians','1thess':'1 thessalonians',
  '2 thessalonians':'2 thessalonians','second thessalonians':'2 thessalonians','2 thess':'2 thessalonians','2thess':'2 thessalonians',
  '1 timothy':'1 timothy','first timothy':'1 timothy','1 tim':'1 timothy','1tim':'1 timothy',
  '2 timothy':'2 timothy','second timothy':'2 timothy','2 tim':'2 timothy','2tim':'2 timothy',
  'titus':'titus','tit':'titus',
  'philemon':'philemon','phlm':'philemon',
  'hebrews':'hebrews','heb':'hebrews',
  'james':'james','jas':'james',
  '1 peter':'1 peter','first peter':'1 peter','1pet':'1 peter',
  '2 peter':'2 peter','second peter':'2 peter','2pet':'2 peter',
  '1 john':'1 john','first john':'1 john','1jn':'1 john',
  '2 john':'2 john','second john':'2 john','2jn':'2 john',
  '3 john':'3 john','third john':'3 john','3jn':'3 john',
  'jude':'jude',
  'revelation':'revelation','revelations':'revelation','rev':'revelation',
};

function spokenToNumber(words) {
  // handles "thirty one", "sixteen", "3", "31", etc.
  let total = 0, current = 0;
  for (const w of words.split(/\s+/)) {
    const n = SPOKEN_NUMS[w];
    if (n !== undefined) {
      if (n === 100) { current = (current || 1) * 100; }
      else if (n >= 20) { current += n; }
      else { current += n; }
    } else {
      const d = parseInt(w);
      if (!isNaN(d)) current += d;
    }
  }
  total += current;
  return total || null;
}

function parseBibleRef(transcript) {
  let t = transcript.toLowerCase()
    .replace(/\bverse\b/g, ':')
    .replace(/\bchapter\b/g, ' ')
    .replace(/\b(turn to|go to|read|open to|let's read|let us read|look at)\b/g, '')
    .replace(/[,;]/g, ' ')
    .trim();

  // Normalise typed ordinal abbreviations globally: "1st" → "1", "2nd" → "2", "3rd" → "3"
  t = t.replace(/\b(1st|2nd|3rd)\b/g, (_, p) => ORDINAL_PREFIX[p]);
  // Normalise spoken ordinals at start of string: "first john" → "1 john"
  t = t.replace(/^(first|second|third)\s+/i, (_, p) => ORDINAL_PREFIX[p.toLowerCase()] + ' ');

  // Try to match a known book name (longest match wins)
  let bookCanon = null, rest = '';
  const sortedAliases = Object.keys(BOOK_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sortedAliases) {
    const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    const m = t.match(re);
    if (m) {
      bookCanon = BOOK_ALIASES[alias];
      rest = t.slice(m.index + m[0].length).trim();
      break;
    }
  }
  if (!bookCanon) return { hasBibleRef: false };

  // Extract numbers from rest — support "3 16", "3:16", "three sixteen"
  const numRe = /(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)/gi;
  const tokens = [...rest.matchAll(numRe)].map(m => m[0].toLowerCase());
  if (!tokens.length) return { hasBibleRef: false };

  // Chapter is the first number group, verse is the second (split on ":")
  let chapter, verse, endVerse;
  if (rest.includes(':')) {
    const [cPart, vPart] = rest.split(':');
    const cTokens = [...cPart.matchAll(numRe)].map(m => m[0]);
    const vTokens = [...vPart.matchAll(numRe)].map(m => m[0]);
    chapter = spokenToNumber(cTokens.join(' '));
    // verse range "16 to 18" or just "16"
    const vNums = vTokens.map(v => spokenToNumber(v)).filter(Boolean);
    verse = vNums[0]; endVerse = vNums[1] || verse;
  } else {
    // space-separated: first token = chapter, rest = verse
    chapter = spokenToNumber(tokens[0]);
    if (tokens.length >= 2) {
      verse = spokenToNumber(tokens.slice(1).join(' '));
      endVerse = verse;
    }
  }

  if (!chapter) return { hasBibleRef: false };
  return { hasBibleRef: true, book: bookCanon, chapter, verse: verse || 1, endVerse: endVerse || verse || 1 };
}

/* -----------------------
   SONG INDEX
   Built once on startup, rebuilt when songs change.
   Maps each song to a set of keywords for fuzzy matching.
----------------------- */
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','of','to','in','is','it','be','as','at','so',
  'we','he','she','by','do','if','me','my','up','go','no','us','am','on','with',
  'for','are','not','you','all','can','was','one','our','out','get','has','him',
  'his','how','its','let','may','now','own','say','too','way','who','did','any',
  'had','see','two','put','oh','that','this','they','from','have','been','will',
  'your','more','when','what','were','also','into','than','then','them','these',
]);

function ngrams(words, n) {
  const out = [];
  for (let i = 0; i <= words.length - n; i++) out.push(words.slice(i, i + n).join(' '));
  return out;
}

let songIndex = [];
let wordDocFreq = new Map(); // word → number of songs it appears in

function normalize(str) {
  return str.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function indexEntry(title, source, firstLines = []) {
  const titleLow = normalize(title);
  const titleWords = titleLow.split(/\s+/).filter(w => w.length >= 2);
  const phrases = new Set();
  const contentWords = new Set();

  phrases.add(titleLow);
  ngrams(titleWords, 2).forEach(b => phrases.add(b));
  titleWords.forEach(w => !STOP_WORDS.has(w) && contentWords.add(w));

  firstLines.forEach(raw => {
    const line = normalize(raw);
    if (!line) return;
    phrases.add(line);
    const lw = line.split(/\s+/).filter(w => w.length >= 2);
    ngrams(lw, 2).forEach(b => phrases.add(b));
    ngrams(lw, 3).forEach(t => phrases.add(t));
    lw.forEach(w => !STOP_WORDS.has(w) && contentWords.add(w));
  });

  return { title, titleLow, titleWords, phrases: [...phrases], contentWords: [...contentWords], ...source };
}

function buildSongIndex() {
  wordDocFreq = new Map();
  const raw = [];

  // ── DB songs: full section indexing ──────────────────────────────
  db.listSongs().forEach(s => {
    const full = db.getSong(s.id);
    const firstLines = (full?.sections || [])
      .map(sec => (sec.text || '').split('\n').find(l => l.trim()) || '');
    raw.push(indexEntry(s.title, { source: 'db', dbId: s.id }, firstLines));
  });

  // ── XML songs: title + first lyric line via lightweight regex ─────
  // Only English to keep index build fast (~3k songs vs 100k total)
  const LANGS_TO_INDEX = ['en'];
  LANGS_TO_INDEX.forEach(lang => {
    const dir = path.join(__dirname, 'songs', lang);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter(f => !f.startsWith('.')).forEach(filename => {
      try {
        const raw_xml = fs.readFileSync(path.join(dir, filename), 'utf-8');
        const titleM = raw_xml.match(/<title>([\s\S]*?)<\/title>/);
        if (!titleM) return;
        const title = titleM[1].trim();
        // Grab first non-chord, non-header lyric line from <lyrics>
        const lyricsM = raw_xml.match(/<lyrics>([\s\S]*?)<\/lyrics>/);
        const firstLine = lyricsM
          ? (lyricsM[1].split('\n').find(l => l.trim() && !l.trim().startsWith('.') && !l.trim().match(/^\[/)) || '').trim()
          : '';
        raw.push(indexEntry(title, { source: 'xml', lang, filename }, firstLine ? [firstLine] : []));
      } catch {}
    });
  });

  // IDF — computed across all songs
  raw.forEach(e => e.contentWords.forEach(w => wordDocFreq.set(w, (wordDocFreq.get(w) || 0) + 1)));
  const total = raw.length || 1;
  songIndex = raw.map(e => ({
    ...e,
    idf: Object.fromEntries(e.contentWords.map(w => [w, Math.log((total + 1) / ((wordDocFreq.get(w) || 1) + 1))])),
  }));

  console.log(`Song index built: ${songIndex.length} songs (${raw.filter(e=>e.source==='db').length} DB + ${raw.filter(e=>e.source==='xml').length} XML)`);
}

function matchSongs(transcript, topN = 5) {
  if (!songIndex.length) return [];

  const phrase = normalize(transcript);
  const allWords = phrase.split(/\s+/).filter(w => w.length >= 2);
  const words = allWords.filter(w => !STOP_WORDS.has(w));
  if (!words.length && !allWords.length) return [];

  // Build n-grams from the query
  const queryBigrams  = ngrams(allWords, 2);
  const queryTrigrams = ngrams(allWords, 3);

  const results = [];

  for (const entry of songIndex) {
    let score = 0;

    // ── Tier 1: title matches (dominant signal) ──────────────────────
    if (entry.titleLow === phrase)                                  score += 12;
    else if (entry.titleLow.includes(phrase))                       score += 9;
    else if (phrase.includes(entry.titleLow) && entry.titleWords.length >= 2) score += 7;

    // Bigram hits inside title
    queryBigrams.forEach(bg => {
      if (entry.titleLow.includes(bg)) score += 3;
    });
    queryTrigrams.forEach(tg => {
      if (entry.titleLow.includes(tg)) score += 4;
    });

    // ── Tier 2: first-line phrase matches ────────────────────────────
    queryBigrams.forEach(bg => {
      if (entry.phrases.includes(bg)) score += 1.5;
    });
    queryTrigrams.forEach(tg => {
      if (entry.phrases.includes(tg)) score += 2.5;
    });
    // Full phrase matches a stored first line
    if (entry.phrases.includes(phrase)) score += 5;

    // ── Tier 3: TF-IDF weighted word overlap (low weight) ────────────
    let idfSum = 0;
    words.forEach(w => {
      if (entry.idf[w] !== undefined) idfSum += entry.idf[w];
    });
    score += idfSum * 0.25;

    if (score > 0) results.push({ ...entry, score });
  }

  return results
    .filter(r => r.score >= 1.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/* -----------------------
   API: IDENTIFY SONG
   Fuzzy-matches a transcript against the local song index.
----------------------- */
app.post("/api/assistant/identify-song", (req, res) => {
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: "Missing transcript" });

  // Rebuild index if empty (first call)
  if (!songIndex.length) buildSongIndex();

  // Skip if it looks like a Bible reference
  const bibleRef = parseBibleRef(transcript);
  if (bibleRef.hasBibleRef) return res.json({ matched: false, reason: 'bible_ref' });

  const matches = matchSongs(transcript);
  if (!matches.length) return res.json({ matched: false });

  const songs = matches.map(m => {
    try {
      if (m.source === 'db') {
        const song = db.getSong(m.dbId);
        return song ? { ...song, score: m.score, source: 'db' } : null;
      } else {
        const song = songxml.readSongFile(m.lang, m.filename);
        return song ? { ...song, score: m.score, source: 'xml', lang: m.lang, filename: m.filename } : null;
      }
    } catch { return null; }
  }).filter(Boolean);

  if (!songs.length) return res.json({ matched: false });
  res.json({ matched: true, songs });
});

/* -----------------------
   API: BROADCAST SONG SECTION
   Pushes a specific section's text+chords to the meeting SSE clients.
----------------------- */
app.post("/api/assistant/broadcast-section", (req, res) => {
  const { meetingName, songTitle, sectionIndex, text, chords } = req.body;
  if (!meetingName || text === undefined) return res.status(400).json({ error: "Missing params" });

  if (!liveMeetings[meetingName]) liveMeetings[meetingName] = { text: '', chords: null, qr: null, clients: [] };
  liveMeetings[meetingName].text = text;
  liveMeetings[meetingName].chords = chords || null;
  liveMeetings[meetingName].qr = null;
  for (const client of (liveMeetings[meetingName].clients || [])) {
    client.write(`data: ${JSON.stringify({ text, chords: chords || null, qr: null })}\n\n`);
  }
  res.json({ status: 'ok' });
});

/* -----------------------
   API: AI MEETING ASSISTANT
   Parses Bible references locally and broadcasts to SSE clients.
----------------------- */
// Cache books list per translation to avoid repeated helloao.org fetches
const helloaoBookCache = new Map();
async function getHelloaoBooks(translationId) {
  if (helloaoBookCache.has(translationId)) return helloaoBookCache.get(translationId);
  const res = await fetch(`https://bible.helloao.org/api/${translationId}/books.json`);
  if (!res.ok) return null;
  const data = await res.json();
  const books = data.books || [];
  helloaoBookCache.set(translationId, books);
  return books;
}

app.post("/api/ai-assistant", async (req, res) => {
  const { transcript, translationId, meetingName } = req.body;
  if (!transcript || !translationId) return res.status(400).json({ error: "Missing transcript or translationId" });

  const parsed = parseBibleRef(transcript);
  if (!parsed.hasBibleRef) {
    return res.json({ handled: false, message: "No Bible reference detected" });
  }

  try {
    const books = await getHelloaoBooks(translationId);
    if (!books) return res.status(404).json({ error: "Translation not found" });

    const q = parsed.book.toLowerCase();
    const bookRow =
      books.find(b => b.name.toLowerCase() === q) ||
      books.find(b => b.name.toLowerCase().startsWith(q)) ||
      books.find(b => b.name.toLowerCase().replace(/\s+/g, ' ').includes(q));

    if (!bookRow) return res.status(404).json({ error: `Book "${parsed.book}" not found` });

    const chRes = await fetch(`https://bible.helloao.org/api/${translationId}/${bookRow.id}/${parsed.chapter}.json`);
    if (!chRes.ok) return res.status(404).json({ error: "Chapter not found" });
    const chData = await chRes.json();

    const allVerses = (chData.chapter?.content || []).filter(c => c.type === 'verse');
    const selected = allVerses.slice(parsed.verse - 1, parsed.endVerse);
    if (!selected.length) return res.status(404).json({ error: "Verse not found" });

    const verseText = selected.map(v => (v.content || []).filter(c => typeof c === 'string').join(' ')).join(' ');
    const verseRange = parsed.verse === parsed.endVerse ? `${parsed.verse}` : `${parsed.verse}–${parsed.endVerse}`;
    const reference = `${bookRow.name} ${parsed.chapter}:${verseRange}`;
    const slideText = `${reference}\n\n${verseText}`;

    if (meetingName) {
      if (!liveMeetings[meetingName]) liveMeetings[meetingName] = { text: '', chords: null, qr: null, clients: [] };
      liveMeetings[meetingName].text = slideText;
      liveMeetings[meetingName].chords = null;
      liveMeetings[meetingName].qr = null;
      for (const client of (liveMeetings[meetingName].clients || [])) {
        client.write(`data: ${JSON.stringify({ text: slideText, chords: null, qr: null })}\n\n`);
      }
    }

    res.json({ handled: true, reference, slideText, parsedRef: { book: parsed.book, chapter: parsed.chapter, verse: parsed.verse, endVerse: parsed.endVerse } });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch verse: ${err.message}` });
  }
});

/* -----------------------
   API: SONG XML LIBRARY
----------------------- */
app.get("/api/song-library/languages", (req, res) => {
  res.json(songxml.listLanguages());
});

app.get("/api/song-library/:lang", (req, res) => {
  res.json(songxml.listSongsWithTitles(req.params.lang));
});

app.get("/api/song-library/:lang/:filename", (req, res) => {
  const song = songxml.readSongFile(req.params.lang, req.params.filename);
  if (!song) return res.status(404).json({ error: "Song not found" });
  res.json(song);
});

app.post("/api/song-library/import", (req, res) => {
  const { lang, filename } = req.body;
  if (!lang || !filename) return res.status(400).json({ error: "Missing lang or filename" });
  const parsed = songxml.readSongFile(lang, filename);
  if (!parsed) return res.status(404).json({ error: "Song file not found" });

  // Create in DB
  const song = db.createSong(parsed.title, lang, parsed.key);
  if (parsed.sections.length) {
    db.saveSongSections(song.id, parsed.sections);
  }
  const full = db.getSong(song.id);
  res.json(full);
});

/* -----------------------
   API: SETLISTS
----------------------- */
// List setlists: show all public, owned, or sharedToSlides
app.get("/api/setlists", (req, res) => {
  const userId = req.isAuthenticated() ? (req.user.emails?.[0]?.value || req.user.email) : null;
  let all = db.listSetlists();
  if (!userId) {
    // Not logged in: only show public (sharedToSlides)
    all = all.filter(s => s.sharedToSlides);
  } else {
    all = all.filter(s => s.owner === userId || s.sharedToSlides);
  }
  res.json(all);
});

app.get("/api/setlists/:id", (req, res) => {
  const sl = db.getSetlist(parseInt(req.params.id));
  if (!sl) return res.status(404).json({ error: "Setlist not found" });
  res.json(sl);
});

app.post("/api/setlists", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Login required" });
  const name = req.body.name;
  const userId = req.user.emails?.[0]?.value || req.user.email;
  if (!name) return res.status(400).json({ error: "Missing setlist name" });
  res.json(db.createSetlist(name, userId));
});
// Share setlist to slides
app.post("/api/setlists/:id/share", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Login required" });
  const id = parseInt(req.params.id);
  const userId = req.user.emails?.[0]?.value || req.user.email;
  const setlist = db.getSetlist(id);
  if (!setlist) return res.status(404).json({ error: "Not found" });
  if (setlist.owner !== userId) return res.status(403).json({ error: "Not owner" });
  db.updateSetlistShareToSlides(id, true);
  res.json({ status: "ok" });
});

app.delete("/api/setlists/:id", (req, res) => {
  db.deleteSetlist(parseInt(req.params.id));
  res.json({ status: "ok" });
});

app.put("/api/setlists/:id/songs", (req, res) => {
  const id = parseInt(req.params.id);
  const songIds = req.body.songIds || [];
  const saved = db.saveSetlistSongs(id, songIds);
  res.json(saved);
});

/* -----------------------
   API: LESSONS
----------------------- */
// List lessons: show owned, sharedWith, or sharedToSlides
app.get("/api/lessons", (req, res) => {
  const userId = req.isAuthenticated() ? (req.user.emails?.[0]?.value || req.user.email) : null;
  let all = db.listLessons();
  if (!userId) {
    // Not logged in: only show lessons shared to slides
    all = all.filter(l => l.sharedToSlides);
  } else {
    all = all.filter(l => l.owner === userId || (Array.isArray(l.sharedWith) && l.sharedWith.includes(userId)) || l.sharedToSlides);
  }
  res.json(all);
});

app.get("/api/lessons/:id", (req, res) => {
  const lesson = db.getLesson(parseInt(req.params.id));
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });
  res.json(lesson);
});

app.post("/api/lessons", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Login required" });
  const name = req.body.name;
  const userId = req.user.emails?.[0]?.value || req.user.email;
  if (!name) return res.status(400).json({ error: "Missing lesson name" });
  res.json(db.createLesson(name, userId));
});
// Share lesson (update sharedWith or sharedToSlides)
app.post("/api/lessons/:id/share", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Login required" });
  const id = parseInt(req.params.id);
  const userId = req.user.emails?.[0]?.value || req.user.email;
  const lesson = db.getLesson(id);
  if (!lesson) return res.status(404).json({ error: "Not found" });
  if (lesson.owner !== userId) return res.status(403).json({ error: "Not owner" });
  const { sharedWith, sharedToSlides } = req.body;
  db.updateLessonSharing(id, sharedWith, sharedToSlides);
  res.json({ status: "ok" });
});

app.patch("/api/lessons/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const name = req.body.name;
  if (!name) return res.status(400).json({ error: "Missing name" });
  db.updateLessonName(id, name);
  res.json({ status: "ok" });
});

app.delete("/api/lessons/:id", (req, res) => {
  db.deleteLesson(parseInt(req.params.id));
  res.json({ status: "ok" });
});

app.put("/api/lessons/:id/slides", (req, res) => {
  const id = parseInt(req.params.id);
  const slides = req.body.slides || [];
  const saved = db.saveLessonSlides(id, slides);
  res.json(saved);
});

/* -----------------------
   API: SERVER-SENT EVENTS
----------------------- */
app.get("/api/events", (req, res) => {
  const meetName = req.query.meet;
  if (!meetName) return res.status(400).end();
  if (!liveMeetings[meetName]) liveMeetings[meetName] = { text: '', chords: null, qr: null, clients: [] };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  if (!liveMeetings[meetName].clients) liveMeetings[meetName].clients = [];
  liveMeetings[meetName].clients.push(res);

  // send current text immediately
  res.write(`data: ${JSON.stringify({ text: liveMeetings[meetName].text, chords: liveMeetings[meetName].chords || null, qr: liveMeetings[meetName].qr || null })}\n\n`);

  req.on("close", () => {
    liveMeetings[meetName].clients = liveMeetings[meetName].clients.filter(c => c !== res);
  });
});

/* -----------------------
   API: UPDATE MEETING TEXT (broadcast)
----------------------- */
app.post("/api/presenter", (req, res) => {
  const name = req.query.meet;
  if (!name) return res.status(400).json({ error: "Missing meeting name" });
  const text = req.body.text || "";
  const chords = req.body.chords || null;
  const qr = req.body.qr || null;
  if (!liveMeetings[name]) liveMeetings[name] = { text: "Welcome", clients: [] };

  // Timer logic: detect and start/stop timer
  clearMeetingTimer(name);
  const timerMatch = text.match(/in (\d+):(\d{2}) minutes|in (\d+) seconds|in (\d+) minute/);
  if (timerMatch) {
    let totalSec = 0;
    if (timerMatch[1] && timerMatch[2]) {
      totalSec = parseInt(timerMatch[1]) * 60 + parseInt(timerMatch[2]);
    } else if (timerMatch[3]) {
      totalSec = parseInt(timerMatch[3]);
    } else if (timerMatch[4]) {
      totalSec = parseInt(timerMatch[4]) * 60;
    }
    if (totalSec > 0) {
      const now = Date.now();
      liveMeetings[name].timerEnd = now + totalSec * 1000;
      liveMeetings[name].timerTemplate = text;
      startMeetingTimer(name);
    }
  }

  liveMeetings[name].text = text;
  liveMeetings[name].chords = chords;
  liveMeetings[name].qr = qr;
  // Broadcast to all SSE clients
  if (liveMeetings[name].clients) {
    for (const res of liveMeetings[name].clients) {
      res.write(`data: ${JSON.stringify({ text, chords, qr })}\n\n`);
    }
  }
  res.json({ status: "ok" });
});

function clearMeetingTimer(name) {
  if (liveMeetings[name] && liveMeetings[name].timer) {
    clearInterval(liveMeetings[name].timer);
    liveMeetings[name].timer = null;
    liveMeetings[name].timerEnd = null;
    liveMeetings[name].timerTemplate = null;
  }
}

function startMeetingTimer(name) {
  if (!liveMeetings[name] || !liveMeetings[name].timerEnd || !liveMeetings[name].timerTemplate) return;
  function updateTimer() {
    const now = Date.now();
    let remaining = Math.max(0, Math.round((liveMeetings[name].timerEnd - now) / 1000));
    let min = Math.floor(remaining / 60);
    let sec = remaining % 60;
    let timeStr = '';
    if (min > 0 || sec > 0) {
      timeStr = `${min}:${sec.toString().padStart(2, '0')}`;
      if (min > 0 && sec === 0) timeStr += ' minutes';
      else if (min === 0 && sec > 0) timeStr += ' seconds';
      else timeStr += ' minutes';
    } else {
      timeStr = '0:00 minutes';
    }
    // Replace the timer in the template
    let newText = liveMeetings[name].timerTemplate.replace(/in (\d+):(\d{2}) minutes|in (\d+) seconds|in (\d+) minute/, `in ${timeStr}`);
    liveMeetings[name].text = newText;
    // Broadcast to all SSE clients
    if (liveMeetings[name].clients) {
      for (const res of liveMeetings[name].clients) {
        res.write(`data: ${JSON.stringify({ text: newText, chords: liveMeetings[name].chords })}\n\n`);
      }
    }
    if (remaining <= 0) {
      clearMeetingTimer(name);
    }
  }
  updateTimer();
  liveMeetings[name].timer = setInterval(updateTimer, 1000);
}
  

/* -----------------------
   SERVE VUE APP (production)
----------------------- */
app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback: serve index.html for all non-API routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

db.init().then(() => {
  buildSongIndex();
  app.listen(PORT, () => {
    console.log(`Server running at https://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialise database", err);
  process.exit(1);
});