#!/usr/bin/env node
/*
 * WebHack i18n — set entries in the compiled zh-CN catalog (src/nhi18n_catalog.h).
 *
 * The catalog header is the source of truth now (the translations.json that
 * gen-c-catalog.mjs was generated from is no longer in this repository). This
 * tool edits it in place without disturbing the other ~10k entries:
 *
 *   node scripts/i18n/catalog-set.mjs <file.json> [--check]
 *
 * <file.json> is an object { "<runtime msgid>": "<zh msgstr>" } with real
 * characters (a JSON "\n" is a newline byte, exactly what the C runtime passes
 * to nhi18n_gettext). An existing msgid has its msgstr replaced in place; a new
 * msgid is appended. Lookups are a linear strcmp scan (src/nhi18n.c), so order
 * does not matter. Strings are emitted with the same octal escaping as
 * gen-c-catalog.mjs. --check prints what would change and writes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const header = path.join(repoRoot, 'src', 'nhi18n_catalog.h');
const [jsonPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const check = process.argv.includes('--check');
if (!jsonPath) { console.error('usage: catalog-set.mjs <file.json> [--check]'); process.exit(2); }

// C literal <-> JS string (UTF-8), matching gen-c-catalog.mjs's emitter.
const encode = (s) => {
  let out = '';
  for (const b of Buffer.from(s, 'utf8')) {
    out += (b >= 0x20 && b <= 0x7e && b !== 0x22 && b !== 0x5c)
      ? String.fromCharCode(b) : '\\' + b.toString(8).padStart(3, '0');
  }
  return out;
};
const ESC = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', "'": "'", '?': '?' };
const decode = (lit) => Buffer.from(lit.replace(/\\([0-7]{1,3})|\\(.)/g,
  (m, o, c) => (o ? String.fromCharCode(parseInt(o, 8)) : (ESC[c] ?? c))), 'latin1').toString('utf8');

const wanted = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let text = fs.readFileSync(header, 'latin1');
const ENTRY = /^    \{ "((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)" \},$/gm;
const seen = new Set();
let replaced = 0;
text = text.replace(ENTRY, (line, id, str) => {
  const key = decode(id);
  if (!(key in wanted) || seen.has(key)) return line;
  seen.add(key);
  const before = decode(str);
  if (before === wanted[key]) return line;
  replaced++;
  console.log(`~ ${JSON.stringify(key)}: ${JSON.stringify(before)} -> ${JSON.stringify(wanted[key])}`);
  return `    { "${encode(key)}", "${encode(wanted[key])}" },`;
});
const added = Object.keys(wanted).filter((k) => !seen.has(k));
for (const k of added) console.log(`+ ${JSON.stringify(k)}: ${JSON.stringify(wanted[k])}`);
if (added.length) {
  const close = text.lastIndexOf('\n};');
  text = text.slice(0, close) + '\n' + added.map((k) => `    { "${encode(k)}", "${encode(wanted[k])}" },`).join('\n') + text.slice(close);
}
const count = [...text.matchAll(ENTRY)].length;
text = text.replace(/Message catalog for zh-CN: \d+ entries\./, `Message catalog for zh-CN: ${count} entries.`);
console.log(`${replaced} replaced, ${added.length} added, ${count} entries${check ? ' (check only, nothing written)' : ''}`);
if (!check) fs.writeFileSync(header, text, 'latin1');
