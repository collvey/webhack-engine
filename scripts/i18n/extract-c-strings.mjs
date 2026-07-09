#!/usr/bin/env node
/*
 * WebHack i18n — C message string extractor (Phase 2 tooling).
 *
 * Scans the C backend for user-facing message call sites (pline(), You(), ...)
 * and extracts their English format-string literals into a gettext .pot template
 * plus a JSON corpus. This is the NetHack-tailored equivalent of xgettext (our
 * message macros aren't the gettext defaults, and format strings are the first
 * arg of custom functions).
 *
 * READ-ONLY over src/ and win/: it never modifies C source, so it cannot affect
 * the build. Verify by running it and inspecting the reported counts / output.
 *
 * Usage:  node scripts/i18n/extract-c-strings.mjs
 * Output: locales/webhack.pot , locales/webhack.corpus.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Message functions whose FIRST string-literal argument is a user-facing format
// string. (custompline/urgent_pline take flags first, but the first *string*
// literal is still the format, so the same scan works.)
const MSG_FUNCS = [
  'pline', 'vpline', 'Norep', 'You', 'Your', 'You_feel', 'You_cant',
  'pline_The', 'There', 'You_hear', 'You_see', 'verbalize', 'custompline',
  'urgent_pline', 'impossible', 'warning', 'raw_printf', 'pline_dir',
];
const FUNC_RE = new RegExp('\\b(' + MSG_FUNCS.join('|') + ')\\s*\\(', 'g');

// Directories to scan (C backend + headless window port).
const SCAN_DIRS = [
  path.join(repoRoot, 'src'),
  path.join(repoRoot, 'win', 'headless'),
];

function listCFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.c'))
    .map(f => path.join(dir, f));
}

// From `text` starting at index `i` (just after the '('), read the first C
// string literal, concatenating adjacent "a" "b" pieces. Returns { value } or
// null if the first non-space argument isn't a string literal (dynamic fmt).
function readFirstLiteral(text, i) {
  let j = i;
  // skip whitespace
  while (j < text.length && /\s/.test(text[j])) j++;
  if (text[j] !== '"') return null; // first arg is not a literal → dynamic fmt
  let value = '';
  while (text[j] === '"') {
    j++; // opening quote
    while (j < text.length && text[j] !== '"') {
      if (text[j] === '\\') { value += text[j] + text[j + 1]; j += 2; }
      else { value += text[j]; j++; }
    }
    j++; // closing quote
    // adjacent-literal concatenation: skip ws (and line continuations)
    let k = j;
    while (k < text.length && /\s/.test(text[k])) k++;
    if (text[k] === '"') { j = k; continue; }
    break;
  }
  return { value };
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

// A msgid is "translatable" if it contains a real word (letters), i.e. not a
// bare format specifier / punctuation like "%s", "%c", " ", ".", "%s%s".
function isTranslatable(s) {
  const stripped = s.replace(/%[-+ 0-9.*#lh]*[a-zA-Z]/g, ''); // remove format specs
  return /[A-Za-z]{2,}/.test(stripped);
}

const corpus = new Map(); // msgid -> Set("file:line")
let rawMatches = 0, dynamicSkipped = 0, nonTranslatable = 0;

for (const dir of SCAN_DIRS) {
  for (const file of listCFiles(dir)) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    let m;
    FUNC_RE.lastIndex = 0;
    while ((m = FUNC_RE.exec(text)) !== null) {
      rawMatches++;
      const lit = readFirstLiteral(text, m.index + m[0].length);
      if (!lit) { dynamicSkipped++; continue; }
      const msgid = lit.value;
      if (!isTranslatable(msgid)) { nonTranslatable++; continue; }
      if (!corpus.has(msgid)) corpus.set(msgid, new Set());
      corpus.get(msgid).add(`${rel}:${lineOf(text, m.index)}`);
    }
  }
}

// --- write .pot ---
const potHeader = [
  'msgid ""', 'msgstr ""',
  '"Project-Id-Version: WebHack\\n"',
  '"Language: \\n"',
  '"MIME-Version: 1.0\\n"',
  '"Content-Type: text/plain; charset=UTF-8\\n"',
  '"Content-Transfer-Encoding: 8bit\\n"', '',
].join('\n');

const entries = [...corpus.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const potBody = entries.map(([msgid, locs]) => {
  const refs = [...locs].sort().map(l => `#: ${l}`).join('\n');
  // msgid is stored with C escapes already intact; .po uses the same escaping.
  return `${refs}\nmsgid "${msgid}"\nmsgstr ""`;
}).join('\n\n');

fs.mkdirSync(path.join(repoRoot, 'locales'), { recursive: true });
fs.writeFileSync(path.join(repoRoot, 'locales', 'webhack.pot'), potHeader + '\n' + potBody + '\n');

// --- write JSON corpus (msgid -> locations) ---
const corpusJson = {};
for (const [msgid, locs] of entries) corpusJson[msgid] = [...locs].sort();
fs.writeFileSync(
  path.join(repoRoot, 'locales', 'webhack.corpus.json'),
  JSON.stringify(corpusJson, null, 2) + '\n'
);

console.log('C message extraction complete:');
console.log('  raw call sites matched :', rawMatches);
console.log('  dynamic fmt skipped    :', dynamicSkipped, '(first arg not a literal)');
console.log('  non-translatable skipped:', nonTranslatable, '(pure format/punctuation)');
console.log('  distinct msgids        :', corpus.size);
console.log('  → locales/webhack.pot');
console.log('  → locales/webhack.corpus.json');
