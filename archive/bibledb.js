/**
 * bibledb.js – Read-only access to the local bible.db SQLite file
 *
 * Uses better-sqlite3 for disk-based (not in-memory) access, so even the
 * 11 GB database works fine on devices with limited RAM like the Pi 2B.
 *
 * Tables used:
 *   Translation – Bible versions (id, name, englishName, shortName, language)
 *   Book        – Books per translation (id, translationId, name, order, numberOfChapters)
 *   ChapterVerse – Individual verses (number, chapterNumber, bookId, translationId, text)
 */

const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "bible.db");

let db = null;

function open() {
  if (db) return db;
  if (!require("fs").existsSync(DB_PATH)) return null;
  db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  db.pragma("cache_size = -64000"); // 64 MB cache
  return db;
}

/* -------------------------------------------------------
   LIST BIBLE LANGUAGES  – distinct languages that have at
   least one translation in the database.
   Names are auto-extracted from EBibleSource descriptions,
   with a manual fallback for well-known languages.
   ------------------------------------------------------- */

/* Manual fallback for languages whose names can't be auto-extracted */
const MANUAL_NAMES = {
  eng: "English", spa: "Spanish",
  arb: "Arabic", bod: "Tibetan", deu: "German", ewe: "Ewe",
  fra: "French", hbo: "Hebrew (Biblical)", ita: "Italian", jpn: "Japanese",
  kor: "Korean", lat: "Latin", pol: "Polish", rup: "Aromanian",
  tgl: "Tagalog", tha: "Thai", ukr: "Ukrainian",
  cmn: "Chinese (Mandarin)", zho: "Chinese", hin: "Hindi",
  por: "Portuguese", rus: "Russian", ben: "Bengali",
  vie: "Vietnamese", tam: "Tamil", pan: "Punjabi",
  swe: "Swedish", ind: "Indonesian", tur: "Turkish",
  urd: "Urdu", wol: "Wolof",
  cak: "Kaqchikel", ctu: "Chol", grc: "Greek (Ancient)",
  kdc: "Kutu", mfx: "Melo", tiw: "Tiwi", tzo: "Tzotzil",
  agt: "Central Cagayan Agta", alw: "Alaba-K'abeena", anh: "Nend",
  apz: "Safeyoka", atd: "Ata Manobo", att: "Pamplona Atta",
  azg: "San Pedro Amuzgos Mixtec", azz: "Highland Puebla Nahuatl",
  bpr: "Koronadal Blaan", bps: "Sarangani Blaan", bzh: "Buang",
  cco: "Comaltepec Chinantec", chd: "Highland Oaxaca Chontal",
  chq: "Quiotepec Chinantec", chz: "Ozumacín Chinantec",
  cnt: "Tepetotutla Chinantec", cpa: "Palantla Chinantec",
  cpb: "Ucayali-Yurúa Ashéninka", crn: "El Nayar Cora",
  cso: "Sochiapam Chinantec", cta: "Tataltepec Chatino",
  ctp: "Western Highland Chatino", cux: "Tepeuxila Cuicatec",
  cya: "Nopala Chatino", dgc: "Casiguran Dumagat Agta",
  dhg: "Warramiri", dik: "Southwestern Dinka", ebk: "Eastern Bontok",
  ffm: "Maasina Fulfulde", fuh: "Fulfulde Burkina",
  gaq: "Gata Didayi", geb: "Kire", gel: "ut-Ma'in",
  glw: "Glavda", gnw: "Western Bolivian Guaraní", gok: "Gawli",
  gui: "Eastern Bolivian Guaraní", gun: "Mbyá Guaraní",
  hns: "Caribbean Hindustani", hto: "Minica Huitoto",
  hus: "Huastec", huv: "San Mateo Del Mar Huave",
  iws: "Sepik Iwam", ixl: "Ixil", jac: "Eastern Jakalteko",
  jum: "Jumjum", jvn: "Caribbean Javanese",
  kmk: "Limos Kalinga", kud: "'Auhelawa", lag: "Rangi",
  lbk: "Central Bontok", maa: "Tecóatl Mazatec",
  maj: "Jalapa de Díaz Mazatec", mam: "Mam",
  maq: "Chiquihuitlán Mazatec", mbb: "Western Bukidnon Manobo",
  mbs: "Sarangani Manobo", mbt: "Matigsalug Manobo",
  mig: "San Miguel el Grande Mixtec", mio: "Pinotepa Nacional Mixtec",
  mit: "Southern Puebla Mixtec", mjc: "San Juan Colorado Mixtec",
  mkl: "Monkole", mkn: "Kupang Malay", mks: "Silacayoapan Mixtec",
  mmo: "Mangga Buang", mxp: "Tlahuitoltepec Mixe",
  myk: "Mamara Sénoufo", nab: "Southern Nambikuára",
  nch: "Huasteca Central Nahuatl", ncj: "Northern Puebla Nahuatl",
  nhe: "Huasteca Oriental Nahuatl", nhg: "Tetelcingo Nahuatl",
  nhi: "Zacatlán-Ahuacatlán Nahuatl", nhw: "Huasteca Occidental Nahuatl",
  nhy: "Northern Oaxaca Nahuatl", npl: "Southeastern Puebla Nahuatl",
  ntu: "Natqgu", otm: "Eastern Highland Otomi",
  ots: "Estado de México Otomi", pga: "Sudanese Creole Arabic",
  pls: "San Marcos Popoloca", poe: "San Juan Atzingo Popoloca",
  poi: "Highland Popoluca", pub: "Purum",
  qub: "Huallaga Huánuco Quechua", quc: "K'iche'",
  quf: "Lambayeque Quechua", quh: "South Bolivian Quechua",
  qul: "North Bolivian Quechua", qup: "Southern Pastaza Quechua",
  qve: "Eastern Apurímac Quechua", qvh: "Huamalíes Quechua",
  qvm: "Margos-Yarowilca Quechua", qvn: "North Junín Quechua",
  qvs: "San Martín Quechua", qvw: "Huaylla Wanca Quechua",
  qvz: "Northern Pastaza Quichua", qwh: "Huaylas Ancash Quechua",
  qxh: "Panao Huánuco Quechua", qxn: "Northern Conchucos Quechua",
  qxo: "Southern Conchucos Quechua", rai: "Ramoaaina",
  sgb: "Mag-antsi Ayta", shj: "Caning", soy: "Sola",
  spm: "Sepen", spp: "Supyire Sénoufo", stp: "Southeastern Tepehuan",
  sur: "Mwaghavul", tac: "Western Tarahumara",
  taj: "Eastern Tamang", tgj: "Tagin", tku: "Upper Necaxa Totonac",
  tof: "Gizrra", too: "Xicotepec Totonac", tpt: "Tlachichilco Tepehua",
  tuf: "Central Tunebo", tzj: "Eastern Tz'utujil",
  udu: "Uduk", uvh: "Urii", xnn: "Northern Kankanay",
  xtd: "Diuxi-Tilantongo Mixtec", xtm: "Magdalena Peñasco Mixtec",
  ydd: "Eastern Yiddish", zaa: "Sierra de Juárez Zapotec",
  zab: "San Juan Guelavía Zapotec", zam: "Miahuatlán Zapotec",
  zao: "Ozolotepec Zapotec", zas: "Santo Domingo Albarradas Zapotec",
  zat: "Tabaa Zapotec", zca: "Coatecas Altas Zapotec",
  zos: "Francisco León Zoque", zpi: "Santa María Quiegolani Zapotec",
  zpv: "Chichicapan Zapotec", zpz: "Texmelucan Zapotec",
  zsr: "Southern Rincon Zapotec", ztq: "Quioquitani-Quierí Zapotec",
  zty: "Yatee Zapotec", zyp: "Zyphe Chin",
  bel: "Belarusian",
};

let _langCache = null;

/**
 * Build language name map from EBibleSource descriptions, then
 * fill gaps from the manual map above.
 */
function buildLangNames(d) {
  // One bulk query: for each language get a representative description
  const rows = d
    .prepare(
      `SELECT t.language, e.description
       FROM Translation t
       LEFT JOIN EBibleSource e ON e.translationId = t.id
       WHERE e.description IS NOT NULL
       GROUP BY t.language`
    )
    .all();

  const names = {};

  for (const r of rows) {
    const desc = r.description || "";
    let name = null;

    // Try patterns in order
    let m;
    m = desc.match(/in the ([A-Z][A-Za-z\u00C0-\u017F\-'() ]+?) [Ll]anguage/);
    if (m) { name = m[1].trim(); }
    if (!name) {
      m = desc.match(/^([A-Z][A-Za-z\u00C0-\u017F\-'(), ]+?):/);
      if (m && m[1].length < 40) name = m[1].trim();
    }
    if (!name) {
      m = desc.match(
        /(?:Testament|Bible|Scripture|Portions|Genesis).*? in ([A-Z][A-Za-z\u00C0-\u017F\-'() ]+?)(?:\s*\(|$)/
      );
      if (m) name = m[1].trim();
    }

    if (name) names[r.language] = name;
  }

  // Apply manual overrides (these always win over regex-extracted names)
  for (const [code, name] of Object.entries(MANUAL_NAMES)) {
    names[code] = name;
  }

  return names;
}

/* Top languages shown by default (before "Show more") */
const POPULAR_LANGS = new Set([
  'eng', 'spa', 'fra', 'por', 'deu', 'rus', 'cmn', 'arb',
  'hin', 'jpn', 'kor', 'ita', 'ind', 'tur', 'vie', 'pol',
  'ukr', 'tgl', 'tha', 'swe',
]);

function listLanguages() {
  if (_langCache) return _langCache;
  const d = open();
  if (!d) return [];
  const langNames = buildLangNames(d);
  const rows = d
    .prepare("SELECT DISTINCT language FROM Translation ORDER BY language")
    .all();
  _langCache = rows.map((r) => ({
    code: r.language,
    name: langNames[r.language] || r.language,
    popular: POPULAR_LANGS.has(r.language),
  }));
  // Sort by display name
  _langCache.sort((a, b) => a.name.localeCompare(b.name));
  return _langCache;
}

/* -------------------------------------------------------
   LIST TRANSLATIONS (Bibles) for a given language code
   ------------------------------------------------------- */
function listTranslations(langCode) {
  const d = open();
  if (!d) return [];
  return d
    .prepare(
      `SELECT id, name, englishName, shortName, language
       FROM Translation
       WHERE language = ?
       ORDER BY englishName`
    )
    .all(langCode);
}

/* -------------------------------------------------------
   LIST BOOKS for a translation
   ------------------------------------------------------- */
function listBooks(translationId) {
  const d = open();
  if (!d) return [];
  return d
    .prepare(
      `SELECT id, name, commonName, "order", numberOfChapters
       FROM Book
       WHERE translationId = ?
       ORDER BY "order"`
    )
    .all(translationId);
}

/* -------------------------------------------------------
   GET CHAPTER COUNT for a book (from Book.numberOfChapters)
   ------------------------------------------------------- */
function getChapterCount(translationId, bookId) {
  const d = open();
  if (!d) return 0;
  const row = d
    .prepare(
      `SELECT numberOfChapters FROM Book
       WHERE translationId = ? AND id = ?`
    )
    .get(translationId, bookId);
  return row ? row.numberOfChapters : 0;
}

/* -------------------------------------------------------
   GET VERSE COUNT for a specific chapter
   ------------------------------------------------------- */
function getVerseCount(translationId, bookId, chapter) {
  const d = open();
  if (!d) return 0;
  const row = d
    .prepare(
      `SELECT COUNT(*) AS cnt FROM ChapterVerse
       WHERE translationId = ? AND bookId = ? AND chapterNumber = ?`
    )
    .get(translationId, bookId, chapter);
  return row ? row.cnt : 0;
}

/* -------------------------------------------------------
   GET VERSES – returns array of { number, text }
   ------------------------------------------------------- */
function getVerses(translationId, bookId, chapter, startVerse, endVerse) {
  const d = open();
  if (!d) return [];
  return d
    .prepare(
      `SELECT number, text FROM ChapterVerse
       WHERE translationId = ? AND bookId = ? AND chapterNumber = ?
         AND number BETWEEN ? AND ?
       ORDER BY number`
    )
    .all(translationId, bookId, chapter, startVerse, endVerse);
}

module.exports = {
  open,
  listLanguages,
  listTranslations,
  listBooks,
  getChapterCount,
  getVerseCount,
  getVerses,
};
