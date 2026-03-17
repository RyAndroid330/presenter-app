/**
 * songxml.js – XML song parser / writer / file-based library scanner
 *
 * XML format (per file):
 *   <?xml version="1.0" encoding="UTF-8"?><song>
 *     <title>Song Title</title>
 *     <key>G</key>
 *     <author>Author Name</author>          (optional)
 *     <hymn_number>1234</hymn_number>       (optional)
 *     <lyrics>[V1]
 * .  G    C       G   D
 *  Great is the darkness ...
 * [C1]
 * . chords...
 *  lyrics...
 * </lyrics>
 *   </song>
 *
 * Chord lines start with '.'
 * Section headers: [V1], [V2], [C1], [C2], [B1], etc.
 */

const fs = require("fs");
const path = require("path");

const SONGS_DIR = path.join(__dirname, "songs");

/** ISO 639 code → full language name */
const LANG_NAMES = {
  aeb: "Tunisian Arabic", af: "Afrikaans", alt: "Southern Altai", ar: "Arabic",
  "ar-EN": "Arabic (English)", az: "Azerbaijani", "az-RU": "Azerbaijani (Russia)",
  ba: "Bashkir", be: "Belarusian", bg: "Bulgarian", bua: "Buryat",
  ceb: "Cebuano", cho: "Choctaw", cnh: "Hakha Chin", crh: "Crimean Tatar",
  cs: "Czech", de: "German", dng: "Dungan", el: "Greek", en: "English",
  es: "Spanish", et: "Estonian", fa: "Persian", fi: "Finnish", fr: "French",
  gnb: "Gã", ha: "Hausa", he: "Hebrew", hr: "Croatian", hu: "Hungarian",
  hy: "Armenian", ibo: "Igbo", id: "Indonesian", isk: "Ishkashimi",
  it: "Italian", ka: "Georgian", "ka-EN": "Georgian (English)",
  kaa: "Karakalpak", "kaa-EN": "Karakalpak (English)",
  kk: "Kazakh", "kk-CN": "Kazakh (China)", "kk-EN": "Kazakh (English)",
  kmr: "Kurdish (Kurmanji)", "kmr-AR": "Kurdish (Arabic)",
  ko: "Korean", krc: "Karachay-Balkar", kv: "Komi",
  ky: "Kyrgyz", "ky-CN": "Kyrgyz (China)", lv: "Latvian",
  mg: "Malagasy", mk: "Macedonian", mn: "Mongolian",
  "mn-TR": "Mongolian (Traditional)", no: "Norwegian", pl: "Polish",
  prs: "Dari", pt: "Portuguese", rmn: "Romani", ro: "Romanian",
  ru: "Russian", "ru-ca": "Russian (Central Asia)",
  sgh: "Shughni", sk: "Slovak", sq: "Albanian", sv: "Swedish",
  sw: "Swahili", ta: "Tamil", tab: "Tabasaran", te: "Telugu",
  tg: "Tajik", "tg-AF": "Tajik (Afghanistan)", th: "Thai",
  tk: "Turkmen", "tk-AR": "Turkmen (Arabic)", "tk-EN": "Turkmen (English)",
  tly: "Talysh", tr: "Turkish", "tr-RU": "Turkish (Russia)",
  tt: "Tatar", tyv: "Tuvan", udi: "Udi", udm: "Udmurt",
  uk: "Ukrainian", ur: "Urdu", uz: "Uzbek", vi: "Vietnamese",
  xmf: "Mingrelian", zh: "Chinese",
  cn: "Chinese", ja: "Japanese", ms: "Malay", hi: "Hindi", bn: "Bengali",
  ug: "Uyghur", "ug-CN": "Uyghur (China)", "uz-EN": "Uzbek (English)",
  xal: "Kalmyk",
};

function langName(code) {
  return LANG_NAMES[code] || code;
}

/** Top song-library languages shown before "Show more" */
const POPULAR_SONG_LANGS = new Set([
  'en', 'es', 'fr', 'pt', 'de', 'ru', 'zh', 'ar',
  'hi', 'ko', 'it', 'id', 'tr', 'uk', 'pl',
  'sv', 'th', 'fa', 'he', 'el',
]);

/* ===============================
   LIBRARY SCANNING
   =============================== */

/** List all language subfolders with full names */
function listLanguages() {
  if (!fs.existsSync(SONGS_DIR)) return [];
  return fs
    .readdirSync(SONGS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ code: d.name, name: langName(d.name), popular: POPULAR_SONG_LANGS.has(d.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** List song filenames for a language */
function listSongsInLanguage(lang) {
  const dir = path.join(SONGS_DIR, lang);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith("."))
    .sort();
}

/** List songs with real titles read from XML <title> tags */
function listSongsWithTitles(lang) {
  const dir = path.join(SONGS_DIR, lang);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => !f.startsWith(".")).sort();
  return files.map((f) => {
    try {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      const m = raw.match(/<title>([\s\S]*?)<\/title>/);
      const title = m ? m[1].trim() : prettifyFilename(f);
      return { filename: f, title };
    } catch {
      return { filename: f, title: prettifyFilename(f) };
    }
  });
}

/** Read and parse a single XML song file */
function readSongFile(lang, filename) {
  const filePath = path.join(SONGS_DIR, lang, filename);
  if (!fs.existsSync(filePath)) return null;
  const xml = fs.readFileSync(filePath, "utf-8");
  return parseXML(xml, lang, filename);
}

/* ===============================
   XML PARSER  →  { title, key, language, sections[] }
   =============================== */

function tag(xml, name) {
  const re = new RegExp("<" + name + ">([\\s\\S]*?)</" + name + ">");
  const m = xml.match(re);
  return m ? m[1] : "";
}

function parseXML(xml, language, filename) {
  const cleaned = xml.replace(/\r/g, "");
  const title = tag(cleaned, "title") || prettifyFilename(filename);
  const key = tag(cleaned, "key") || "";
  const lyrics = tag(cleaned, "lyrics");

  const sections = parseLyrics(lyrics);
  return { title, key, language: language || "en", sections, filename };
}

function prettifyFilename(fn) {
  // Remove trailing " iNNNNN" identifier and capitalise words
  return fn
    .replace(/\s+i\d+$/, "")
    .replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}

/* ---- Parse <lyrics> block ---- */
function parseLyrics(raw) {
  if (!raw) return [];
  const lines = raw.replace(/\r/g, "").split("\n");
  const sections = [];
  let curType = "verse";
  let curNumber = 1;
  let pairs = []; // { chordLine: string|null, lyric: string }

  // Map section header codes to our types
  function headerToType(code) {
    const c = code.toUpperCase();
    if (c.startsWith("V")) return "verse";
    if (c.startsWith("C")) return "chorus";
    if (c.startsWith("B")) return "bridge";
    if (c.startsWith("I")) return "intro";
    return "verse";
  }

  function flush() {
    if (!pairs.length) return;
    let text = "";
    let chords = {};
    let charIdx = 0;
    for (const p of pairs) {
      if (text) {
        text += "\n";
        charIdx++;
      }
      const lyric = p.lyric;
      if (p.chordLine !== null) {
        const parsed = parseChordsFromDotLine(p.chordLine, charIdx);
        Object.assign(chords, parsed);
      }
      text += lyric;
      charIdx += lyric.length;
    }
    if (text.trim() || Object.keys(chords).length) {
      sections.push({
        type: curType,
        text,
        chords: JSON.stringify(chords),
      });
    }
    pairs = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Section header: [V1], [C1], [B1], etc.
    const hm = trimmed.match(/^\[([A-Za-z]+)(\d*)\]$/);
    if (hm) {
      flush();
      curType = headerToType(hm[1]);
      curNumber = hm[2] ? parseInt(hm[2]) : 1;
      continue;
    }

    // Chord line (starts with '.')
    if (line.startsWith(".")) {
      const chordLine = line.substring(1); // strip leading dot
      // Look ahead for a lyric line
      let ni = i + 1;
      while (ni < lines.length && !lines[ni].trim()) ni++;
      if (
        ni < lines.length &&
        !lines[ni].startsWith(".") &&
        !lines[ni].trim().match(/^\[/)
      ) {
        const lyric = lines[ni].startsWith(" ")
          ? lines[ni].substring(1)
          : lines[ni]; // strip leading space
        pairs.push({ chordLine, lyric: lyric.trimEnd() });
        i = ni; // skip lyric line
      } else {
        // Chord-only line (instrumental)
        pairs.push({
          chordLine,
          lyric: " ".repeat(chordLine.length),
        });
      }
      continue;
    }

    // Plain lyric line (strip leading space if exists)
    const lyric = line.startsWith(" ") ? line.substring(1) : line;
    pairs.push({ chordLine: null, lyric: lyric.trimEnd() });
  }
  flush();
  return sections;
}

/** Parse a chord line (after removing the leading '.') into { charIndex: chordName } */
function parseChordsFromDotLine(chordLine, baseIdx) {
  const chords = {};
  let i = 0;
  while (i < chordLine.length) {
    if (chordLine[i] === " ") {
      i++;
      continue;
    }
    let j = i;
    while (j < chordLine.length && chordLine[j] !== " ") j++;
    const chord = chordLine.substring(i, j);
    if (chord) {
      chords[baseIdx + i] = chord;
    }
    i = j;
  }
  return chords;
}

/* ===============================
   XML WRITER  –  song object → XML string
   =============================== */

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function songToXML(song) {
  const title = escapeXml(song.title || "Untitled");
  const key = escapeXml(song.key || "");

  let lyrics = "";
  const sectionCounts = {};

  for (const sec of song.sections || []) {
    const type = sec.type || "verse";
    const typeCode =
      type === "chorus" ? "C" : type === "bridge" ? "B" : type === "intro" ? "I" : "V";
    sectionCounts[typeCode] = (sectionCounts[typeCode] || 0) + 1;
    const header = `[${typeCode}${sectionCounts[typeCode]}]`;

    const chords =
      typeof sec.chords === "string" ? JSON.parse(sec.chords || "{}") : sec.chords || {};
    const text = sec.text || "";

    lyrics += header + "\n";

    // Build chord + lyric interleaved lines
    const textLines = text.split("\n");
    let charIdx = 0;
    for (let li = 0; li < textLines.length; li++) {
      const lyricLine = textLines[li];
      const nextCharIdx = charIdx + lyricLine.length + 1; // +1 for newline

      // Collect chords for this line range (up to next line start)
      const lineChords = {};
      for (const [c, chord] of Object.entries(chords)) {
        const ci = Number(c);
        if (ci >= charIdx && ci < nextCharIdx) {
          lineChords[ci - charIdx] = chord;
        }
      }

      if (Object.keys(lineChords).length > 0) {
        // Build chord line
        let cl = "";
        const maxPos = Math.max(
          ...Object.keys(lineChords).map(Number),
          lyricLine.length
        );
        let pos = 0;
        const sortedPositions = Object.keys(lineChords)
          .map(Number)
          .sort((a, b) => a - b);
        for (const p of sortedPositions) {
          while (cl.length < p) cl += " ";
          cl += lineChords[p];
          pos = cl.length;
        }
        lyrics += "." + cl + "\n";
      }
      lyrics += " " + lyricLine + "\n";
      charIdx = nextCharIdx; // advance past newline
    }
    lyrics += "\n";
  }

  return (
    '<?xml version="1.0" encoding="UTF-8"?><song><title>' +
    title +
    "</title>\n<key>" +
    key +
    "</key>\n<lyrics>" +
    lyrics.trimEnd() +
    "</lyrics>\n</song>\n"
  );
}

/** Write a song to the songs folder as XML */
function writeSongFile(song) {
  const lang = song.language || "en";
  const dir = path.join(SONGS_DIR, lang);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Filename: lowercase title + space + iID
  const safeName = (song.title || "untitled")
    .toLowerCase()
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const filename = song.id ? `${safeName} i${song.id}` : safeName;
  const filePath = path.join(dir, filename);

  const xml = songToXML(song);
  fs.writeFileSync(filePath, xml, "utf-8");
  return { lang, filename };
}

module.exports = {
  listLanguages,
  listSongsInLanguage,
  listSongsWithTitles,
  readSongFile,
  parseXML,
  songToXML,
  writeSongFile,
  langName,
};
