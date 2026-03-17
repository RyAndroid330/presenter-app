const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./db");
const songxml = require("./songxml");


const app = express();
const PORT = 3000;

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
  callbackURL: '/auth/google/callback'
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
  if (!meetName || !liveMeetings[meetName]) return res.status(404).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  if (!liveMeetings[meetName].clients) liveMeetings[meetName].clients = [];
  liveMeetings[meetName].clients.push(res);

  // send current text immediately
  res.write(`data: ${JSON.stringify({ text: liveMeetings[meetName].text, chords: liveMeetings[meetName].chords || null })}\n\n`);

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
  // Broadcast to all SSE clients
  if (liveMeetings[name].clients) {
    for (const res of liveMeetings[name].clients) {
      res.write(`data: ${JSON.stringify({ text, chords })}\n\n`);
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
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialise database", err);
  process.exit(1);
});
