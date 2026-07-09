#!/usr/bin/env node
/*
 * WebHack i18n — apply name-convention review decisions.
 *
 * Reads a decisions JSON exported by name-convention.html and writes the
 * `chosen` name into the zh-CN base-name tables:
 *   monsters -> webhack-client/public/data/monster-names.zh-CN.json  (keyed PM_*)
 *   objects  -> webhack-client/public/data/object-names.zh-CN.json   (keyed ONAME)
 *
 * Safety: each entry is only rewritten if the table's current value still
 * matches the decision's recorded `ours`; otherwise it's reported as a conflict
 * and left untouched (the table drifted since the review was exported).
 *
 * After writing, regenerate the WASM-baked C header:
 *   node scripts/i18n/gen-c-monnames.mjs        (then rebuild the WASM)
 *
 * Usage: node scripts/i18n/apply-name-convention.mjs <decisions.json> [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = (...p) => path.join(repo, ...p);

const file = process.argv[2];
const dry = process.argv.includes('--dry');
if (!file) { console.error('usage: apply-name-convention.mjs <decisions.json> [--dry]'); process.exit(1); }
const decisions = JSON.parse(fs.readFileSync(file, 'utf8'));

const TABLES = {
  monsters: R('webhack-client/public/data/monster-names.zh-CN.json'),
  objects: R('webhack-client/public/data/object-names.zh-CN.json'),
};

let changed = 0, skipped = 0, conflicts = 0, noop = 0;
for (const kind of ['monsters', 'objects']) {
  const list = decisions[kind] || [];
  if (!list.length) continue;
  const tablePath = TABLES[kind];
  const table = JSON.parse(fs.readFileSync(tablePath, 'utf8'));
  const applied = [];
  for (const d of list) {
    if (!d.decision || d.decision === 'ours') { skipped++; continue; }       // keep local -> nothing to do
    const target = d.chosen;
    if (target == null || target === '') { skipped++; continue; }
    const curr = table[d.key];
    if (curr === target) { noop++; continue; }                                // already the chosen value
    if (curr !== d.ours) {                                                     // table drifted since export
      conflicts++;
      console.log(`  CONFLICT ${kind} ${d.key} (${d.en}): table has "${curr}", review expected "${d.ours}" — left unchanged`);
      continue;
    }
    applied.push([d.key, d.en, curr, target, d.decision]);
    table[d.key] = target;
    changed++;
  }
  if (applied.length) {
    for (const [key, en, from, to, dec] of applied) console.log(`  ${kind} ${key} (${en}): ${from} → ${to}  [${dec}]`);
    if (!dry) {
      fs.writeFileSync(tablePath, JSON.stringify(table, null, 2) + '\n');
      console.log(`  wrote ${path.relative(repo, tablePath)} (${applied.length} names)`);
    }
  }
}
console.log(`\n${dry ? '[dry-run] ' : ''}changed ${changed}, already-set ${noop}, kept-local/blank ${skipped}, conflicts ${conflicts}`);
if (!dry && changed && (decisions.monsters || []).some(d => d.decision && d.decision !== 'ours'))
  console.log('Next: node scripts/i18n/gen-c-monnames.mjs  → then rebuild the WASM for in-game effect.');
