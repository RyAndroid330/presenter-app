function deleteSetlist(id) {
  transaction(() => {
    db.run("DELETE FROM setlist_songs WHERE setlist_id = ?", [id]);
    db.run("DELETE FROM setlists WHERE id = ?", [id]);
  });
}

function saveSetlistSongs(setlistId, songIds) {
  transaction(() => {
    db.run("DELETE FROM setlist_songs WHERE setlist_id = ?", [setlistId]);
    songIds.forEach((songId, i) => {
      db.run("INSERT INTO setlist_songs (setlist_id, song_id, position) VALUES (?, ?, ?)", [setlistId, songId, i]);
    });
  });
  return queryAll(
    "SELECT ss.position, s.id as song_id, s.title FROM setlist_songs ss JOIN songs s ON ss.song_id = s.id WHERE ss.setlist_id = ? ORDER BY ss.position",
    [setlistId]
  );
}
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "presenter.db");
let db;

/* -----------------------
   HELPERS
----------------------- */
function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/** Run a SELECT and return an array of row objects */
function queryAll(sql, params) {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/** Run a SELECT and return the first row object or null */
function queryOne(sql, params) {
  const rows = queryAll(sql, params);
  return rows.length ? rows[0] : null;
}

/** Run an INSERT / UPDATE / DELETE, persist, and return lastInsertRowid */
function run(sql, params) {
  db.run(sql, params);
  const id = db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0];
  persist();
  return id;
}

/** Run multiple statements inside BEGIN/COMMIT, persist once at the end */
function transaction(fn) {
  db.run("BEGIN");
  try {
    fn();
    db.run("COMMIT");
    persist();
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }
}

/* -----------------------
   INIT
----------------------- */
async function init() {
  const SQL = await initSqlJs();
  try {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } catch (e) {
    db = new SQL.Database();
  }

  db.run("PRAGMA journal_mode = WAL");

  /* SCHEMA */
  db.run(`CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
  )`);
  db.run("CREATE INDEX IF NOT EXISTS idx_slides_meeting ON slides(meeting_id, position)");

  db.run(`CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS song_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'verse',
    position INTEGER NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
  )`);
  db.run("CREATE INDEX IF NOT EXISTS idx_song_sections ON song_sections(song_id, position)");

  // Migration: add chords column if not present
  try { db.run("ALTER TABLE song_sections ADD COLUMN chords TEXT NOT NULL DEFAULT '{}'"); } catch (e) { /* already exists */ }

  // Migration: add language and key columns to songs
  try { db.run("ALTER TABLE songs ADD COLUMN language TEXT NOT NULL DEFAULT 'en'"); } catch (e) { /* already exists */ }
  try { db.run("ALTER TABLE songs ADD COLUMN key TEXT NOT NULL DEFAULT ''"); } catch (e) { /* already exists */ }

  db.run(`CREATE TABLE IF NOT EXISTS setlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner TEXT,
    sharedToSlides INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS setlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
  )`);
  db.run("CREATE INDEX IF NOT EXISTS idx_setlist_songs ON setlist_songs(setlist_id, position)");

  db.run(`CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner TEXT,
    sharedWith TEXT,
    sharedToSlides INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
    // Migrations for lessons
    try { db.run("ALTER TABLE lessons ADD COLUMN owner TEXT"); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE lessons ADD COLUMN sharedWith TEXT"); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE lessons ADD COLUMN sharedToSlides INTEGER NOT NULL DEFAULT 0"); } catch (e) { /* already exists */ }
    // Migrations for setlists
    try { db.run("ALTER TABLE setlists ADD COLUMN owner TEXT"); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE setlists ADD COLUMN sharedToSlides INTEGER NOT NULL DEFAULT 0"); } catch (e) { /* already exists */ }
  db.run(`CREATE TABLE IF NOT EXISTS lesson_slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
  )`);
  db.run("CREATE INDEX IF NOT EXISTS idx_lesson_slides ON lesson_slides(lesson_id, position)");

  persist();
}

/* -----------------------
   MEETINGS
----------------------- */
function listMeetings() {
  return queryAll("SELECT id, name FROM meetings ORDER BY created_at DESC");
}

function getMeeting(name) {
  return queryOne("SELECT id, name FROM meetings WHERE name = ?", [name]);
}

function createMeeting(name) {
  run("INSERT OR IGNORE INTO meetings (name) VALUES (?)", [name]);
  return queryOne("SELECT id, name FROM meetings WHERE name = ?", [name]);
}

function deleteMeeting(id) {
  transaction(() => {
    db.run("DELETE FROM slides WHERE meeting_id = ?", [id]);
    db.run("DELETE FROM meetings WHERE id = ?", [id]);
  });
}

function getSlides(meetingId) {
  return queryAll("SELECT id, text, position FROM slides WHERE meeting_id = ? ORDER BY position", [meetingId]);
}

function saveSlides(meetingId, slideTexts) {
  transaction(() => {
    db.run("DELETE FROM slides WHERE meeting_id = ?", [meetingId]);
    slideTexts.forEach((text, i) => {
      db.run("INSERT INTO slides (meeting_id, position, text) VALUES (?, ?, ?)", [meetingId, i, text]);
    });
  });
  return getSlides(meetingId);
}

/* -----------------------
   SONGS
----------------------- */
function listSongs() {
  return queryAll("SELECT id, title, language, key FROM songs ORDER BY title");
}

function getSong(id) {
  const song = queryOne("SELECT id, title, language, key FROM songs WHERE id = ?", [id]);
  if (!song) return null;
  song.sections = queryAll("SELECT id, type, position, text, chords FROM song_sections WHERE song_id = ? ORDER BY position", [id]);
  return song;
}

function createSong(title, language, key) {
  language = language || 'en';
  key = key || '';
  const id = run("INSERT INTO songs (title, language, key) VALUES (?, ?, ?)", [title, language, key]);
  return { id, title, language, key, sections: [] };
}

function updateSong(id, title, language, key) {
  run("UPDATE songs SET title = ?, language = ?, key = ? WHERE id = ?", [title, language || 'en', key || '', id]);
}

function deleteSong(id) {
  transaction(() => {
    db.run("DELETE FROM song_sections WHERE song_id = ?", [id]);
    db.run("DELETE FROM songs WHERE id = ?", [id]);
  });
}

function saveSongSections(songId, sections) {
  transaction(() => {
    db.run("DELETE FROM song_sections WHERE song_id = ?", [songId]);
    sections.forEach((s, i) => {
      db.run(
        "INSERT INTO song_sections (song_id, type, position, text, chords) VALUES (?, ?, ?, ?, ?)",
        [songId, s.type || "verse", i, s.text || "", s.chords || "{}"]
      );
    });
  });
  return queryAll("SELECT id, type, position, text, chords FROM song_sections WHERE song_id = ? ORDER BY position", [songId]);
}

/* -----------------------
   SETLISTS
----------------------- */
function listSetlists() {
  return queryAll("SELECT id, name, owner, sharedToSlides FROM setlists ORDER BY created_at DESC");
}


function getSetlist(id) {
  const sl = queryOne("SELECT id, name, owner, sharedToSlides FROM setlists WHERE id = ?", [id]);
  if (!sl) return null;
  sl.songs = queryAll(
    "SELECT ss.position, s.id as song_id, s.title FROM setlist_songs ss JOIN songs s ON ss.song_id = s.id WHERE ss.setlist_id = ? ORDER BY ss.position",
    [id]
  );
  return sl;
}

function createSetlist(name, owner) {
  const id = run("INSERT INTO setlists (name, owner) VALUES (?, ?)", [name, owner || null]);
  return { id, name, owner, sharedToSlides: 0, songs: [] };
}

function updateSetlistShareToSlides(id, shared) {
  run("UPDATE setlists SET sharedToSlides = ? WHERE id = ?", [shared ? 1 : 0, id]);
}

/* -----------------------
   LESSONS
----------------------- */
function listLessons() {
  // Parse sharedWith as array
  return queryAll("SELECT id, name, owner, sharedWith, sharedToSlides FROM lessons ORDER BY created_at DESC").map(l => ({
    ...l,
    sharedWith: l.sharedWith ? JSON.parse(l.sharedWith) : []
  }));
}

function getLesson(id) {
  const lesson = queryOne("SELECT id, name, owner, sharedWith, sharedToSlides FROM lessons WHERE id = ?", [id]);
  if (!lesson) return null;
  lesson.sharedWith = lesson.sharedWith ? JSON.parse(lesson.sharedWith) : [];
  lesson.slides = queryAll("SELECT id, text, position FROM lesson_slides WHERE lesson_id = ? ORDER BY position", [id]).map(s => s.text);
  return lesson;
}
function updateLessonSharing(id, sharedWith, sharedToSlides) {
  run("UPDATE lessons SET sharedWith = ?, sharedToSlides = ? WHERE id = ?", [JSON.stringify(sharedWith || []), sharedToSlides ? 1 : 0, id]);
}

function createLesson(name, owner) {
  const id = run("INSERT INTO lessons (name, owner, sharedWith, sharedToSlides) VALUES (?, ?, ?, 0)", [name, owner || null, JSON.stringify([])]);
  return { id, name, owner, sharedWith: [], sharedToSlides: 0, slides: [] };
}

function updateLessonName(id, name) {
  run("UPDATE lessons SET name = ? WHERE id = ?", [name, id]);
}

function deleteLesson(id) {
  transaction(() => {
    db.run("DELETE FROM lesson_slides WHERE lesson_id = ?", [id]);
    db.run("DELETE FROM lessons WHERE id = ?", [id]);
  });
}

function saveLessonSlides(lessonId, slideTexts) {
  transaction(() => {
    db.run("DELETE FROM lesson_slides WHERE lesson_id = ?", [lessonId]);
    slideTexts.forEach((text, i) => {
      db.run("INSERT INTO lesson_slides (lesson_id, position, text) VALUES (?, ?, ?)", [lessonId, i, text]);
    });
  });
  return queryAll("SELECT id, text, position FROM lesson_slides WHERE lesson_id = ? ORDER BY position", [lessonId]).map(s => s.text);
}

module.exports = {
  init,
  listMeetings,
  getMeeting,
  createMeeting,
  deleteMeeting,
  getSlides,
  saveSlides,
  listSongs,
  getSong,
  createSong,
  updateSong,
  deleteSong,
  saveSongSections,
  listSetlists,
  getSetlist,
  createSetlist,
  deleteSetlist,
  saveSetlistSongs,
  updateSetlistShareToSlides,
  listLessons,
  getLesson,
  createLesson,
  updateLessonName,
  deleteLesson,
  saveLessonSlides,
  updateLessonSharing,
};
