#!/usr/bin/env node
/*
 * WebHack i18n — apply encyclopedia (data.base) translations from
 * locales/zh-CN/dat/data.json into the DLB `data` member of sys/wasm/nhdat.
 * Translations are keyed by an entry's first index key; each value is the new
 * array of text lines (leading indent char preserved). Index offsets/counts are
 * recomputed by dlb-data.mjs encodeData. Idempotent. Then rebuild WASM.
 *
 * Usage: node scripts/i18n/apply-data-translations.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDlb, writeDlb } from './dlb.mjs';
import { parseData, encodeData } from './dlb-data.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NHDAT = path.join(repoRoot, 'sys', 'wasm', 'nhdat');
const trans = JSON.parse(fs.readFileSync(path.join(repoRoot, 'locales', 'zh-CN', 'dat', 'data.json'), 'utf8'));

const arc = readDlb(NHDAT);
const dataEntry = arc.entries.find((e) => e.fname === 'data');
const parsed = parseData(dataEntry.data);

let applied = 0, missing = [];
for (const [key, lines] of Object.entries(trans)) {
  if (key.startsWith('_')) continue;
  const e = parsed.entries.find((x) => x.keys[0] === key);
  if (!e) { missing.push(key); continue; }
  // store as binary latin1 of the UTF-8 bytes so encodeData length math is byte-accurate
  e.lines = lines.map((l) => Buffer.from(l, 'utf8').toString('binary'));
  applied++;
}
console.log(`applied ${applied} entries; missing: ${missing.length ? missing.join(', ') : 'none'}`);

const newData = encodeData(parsed);
console.log(`data member: old=${dataEntry.data.length}B new=${newData.length}B`);

// verify: re-parse the new member and confirm the translated entry reads back
const rt = parseData(newData);
for (const key of Object.keys(trans)) {
  if (key.startsWith('_')) continue;
  const e = rt.entries.find((x) => x.keys[0] === key);
  const got = e ? Buffer.from(e.lines.join('\n'), 'binary').toString('utf8') : '';
  const want = trans[key].join('\n');
  console.log(`  verify "${key}": ${got === want ? 'OK' : 'MISMATCH'}`);
}

if (process.argv.includes('--write')) {
  const members = arc.entries.filter((e) => e.fname !== 'Directory')
    .map((e) => ({ fname: e.fname, data: e.fname === 'data' ? newData : e.data }));
  fs.writeFileSync(NHDAT, writeDlb(members));
  console.log('wrote sys/wasm/nhdat');
}
