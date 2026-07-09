#!/usr/bin/env node
/*
 * WebHack i18n — merge translated batch files (po_batch_N.zh.json) back into
 * locales/<lang>/webhack.translations.json, with printf-specifier integrity
 * checks. Reads the paired po_batch_N.json (the msgids that round) so it only
 * merges the current batch.
 *
 * Usage: node scripts/i18n/merge-batch.mjs <scratchDir> [groups=5] [lang=zh-CN]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const scratch = process.argv[2];
const groups = parseInt(process.argv[3] || '5', 10);
const lang = process.argv[4] || 'zh-CN';
if (!scratch) { console.error('need scratchDir'); process.exit(1); }

const trPath = path.join(repoRoot, 'locales', lang, 'webhack.translations.json');
const tr = fs.existsSync(trPath) ? JSON.parse(fs.readFileSync(trPath, 'utf8')) : {};

// Extract conversion specifiers as an ORDERED sequence (excluding %%), so we
// enforce both the set AND the order — printf consumes varargs positionally, so
// a reordered translation would misread arguments (crash/garbage).
const specRe = /%\d+\$[a-zA-Z]|%[-+ 0-9.*#lh]*[a-zA-Z%]/g;
const specKey = s => {
  const out = [];
  let m;
  specRe.lastIndex = 0;
  while ((m = specRe.exec(s))) {
    if (m[0] === '%%') continue;
    out.push(m[0].replace(/^%[-+ 0-9.*#lh]*/, '%').replace(/^%\d+\$/, '%'));
  }
  return out.join(','); // ordered, not sorted
};

let added = 0, missing = 0;
const specMismatch = [], positional = [];
for (let i = 1; i <= groups; i++) {
  const bp = path.join(scratch, `po_batch_${i}.json`);
  const zp = path.join(scratch, `po_batch_${i}.zh.json`);
  if (!fs.existsSync(bp) || !fs.existsSync(zp)) continue;
  const ids = JSON.parse(fs.readFileSync(bp, 'utf8'));
  const zh = JSON.parse(fs.readFileSync(zp, 'utf8'));
  for (const id of ids) {
    const v = zh[id];
    if (typeof v !== 'string' || !v.trim()) { missing++; continue; }
    if (/%\d+\$/.test(v)) positional.push(id.slice(0, 50));
    if (specKey(id) !== specKey(v)) { specMismatch.push(id.slice(0, 50)); continue; } // skip unsafe
    tr[id] = v; added++;
  }
}
fs.writeFileSync(trPath, JSON.stringify(tr, null, 2) + '\n');
console.log('merged:', added, '| total:', Object.keys(tr).length);
console.log('skipped (missing):', missing);
console.log('skipped (spec mismatch):', specMismatch.length, specMismatch.slice(0, 8));
console.log('positional-arg (flagged, not merged if mismatch):', positional.length, positional.slice(0, 5));
