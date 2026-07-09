#!/usr/bin/env node
/*
 * WebHack i18n — generate locales/<lang>/webhack.po from the extracted template
 * (locales/webhack.pot) plus an accumulating translation map
 * (locales/<lang>/webhack.translations.json : { msgid: msgstr }).
 *
 * Re-runnable: fills msgstr where a translation exists, leaves it empty
 * otherwise, and preserves the #: file:line references from the .pot. Data-only
 * (no C build involvement). Reports coverage.
 *
 * Usage: node scripts/i18n/gen-po.mjs [lang]   (default lang: zh-CN)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lang = process.argv[2] || 'zh-CN';

const corpus = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'locales', 'webhack.corpus.json'), 'utf8')
);
const trPath = path.join(repoRoot, 'locales', lang, 'webhack.translations.json');
const translations = fs.existsSync(trPath)
  ? JSON.parse(fs.readFileSync(trPath, 'utf8'))
  : {};

// msgid keys in the corpus are stored with C escapes already intact (\n, \").
// A translation value is plain UTF-8 text; escape it for .po.
function poEscape(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}

const header = [
  'msgid ""', 'msgstr ""',
  '"Project-Id-Version: WebHack\\n"',
  `"Language: ${lang}\\n"`,
  '"MIME-Version: 1.0\\n"',
  '"Content-Type: text/plain; charset=UTF-8\\n"',
  '"Content-Transfer-Encoding: 8bit\\n"', '',
].join('\n');

const ids = Object.keys(corpus).sort((a, b) => a.localeCompare(b));
let translated = 0;
const body = ids.map(msgid => {
  const refs = corpus[msgid].map(l => `#: ${l}`).join('\n');
  const raw = translations[msgid];
  const msgstr = (typeof raw === 'string' && raw.trim()) ? raw : '';
  if (msgstr) translated++;
  // msgid is already escaped (from extractor); msgstr needs escaping.
  return `${refs}\nmsgid "${msgid}"\nmsgstr "${msgstr ? poEscape(msgstr) : ''}"`;
}).join('\n\n');

fs.mkdirSync(path.join(repoRoot, 'locales', lang), { recursive: true });
fs.writeFileSync(path.join(repoRoot, 'locales', lang, 'webhack.po'), header + '\n' + body + '\n');

const pct = ((translated / ids.length) * 100).toFixed(1);
console.log(`webhack.po (${lang}): ${translated}/${ids.length} translated (${pct}%)`);
console.log(`  → locales/${lang}/webhack.po`);
