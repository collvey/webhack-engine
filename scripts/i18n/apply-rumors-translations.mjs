#!/usr/bin/env node
/*
 * WebHack i18n — apply rumors translations from locales/zh-CN/dat/rumors.json
 * into the DLB `rumors` member of sys/wasm/nhdat. Keyed by exact English text
 * (unpadded). Untranslated lines stay English. Re-pads + recomputes offsets via
 * dlb-rumors.mjs. Idempotent. Then rebuild WASM.
 *
 * Usage: node scripts/i18n/apply-rumors-translations.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDlb, writeDlb } from './dlb.mjs';
import { parseRumors, encodeRumors } from './dlb-rumors.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NHDAT = path.join(repoRoot, 'sys', 'wasm', 'nhdat');
const trans = JSON.parse(fs.readFileSync(path.join(repoRoot, 'locales', 'zh-CN', 'dat', 'rumors.json'), 'utf8'));

const arc = readDlb(NHDAT);
const rumEntry = arc.entries.find((e) => e.fname === 'rumors');
const parsed = parseRumors(rumEntry.data);

// strip existing padding to get the raw English/zh body, translate, store as
// UTF-8-bytes-in-binary so re-pad/encode length math is byte-accurate.
const strip = (l) => l.replace(/_+$/, '');
let applied = 0;
const applySection = (lines, dict) => lines.map((l) => {
  const en = strip(l);
  if (dict[en] !== undefined) { applied++; return Buffer.from(dict[en], 'utf8').toString('binary'); }
  return en;
});
parsed.trueLines = applySection(parsed.trueLines, trans.true || {});
parsed.falseLines = applySection(parsed.falseLines, trans.false || {});
console.log(`applied ${applied} rumor translations (true=${Object.keys(trans.true||{}).length}, false=${Object.keys(trans.false||{}).length})`);

const newData = encodeRumors(parsed);
console.log(`rumors member: old=${rumEntry.data.length}B new=${newData.length}B`);

// verify: re-parse and confirm a translated line reads back as zh
const rt = parseRumors(newData);
const sample = Object.entries(trans.true || {})[0];
if (sample) {
  const got = rt.trueLines.map((l) => Buffer.from(strip(l), 'binary').toString('utf8'));
  console.log(`  verify "${sample[1]}": ${got.includes(sample[1]) ? 'OK' : 'MISMATCH'}`);
}

if (process.argv.includes('--write')) {
  const members = arc.entries.filter((e) => e.fname !== 'Directory')
    .map((e) => ({ fname: e.fname, data: e.fname === 'rumors' ? newData : e.data }));
  fs.writeFileSync(NHDAT, writeDlb(members));
  console.log('wrote sys/wasm/nhdat');
}
