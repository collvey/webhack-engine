#!/usr/bin/env node
/*
 * WebHack i18n — write the next N untranslated msgids (from webhack.corpus.json,
 * minus those already in <lang>/webhack.translations.json) into G batch files
 * under the scratchpad, for parallel translation agents.
 *
 * Each batch file is a JSON array of English msgids. Agents return a
 * { msgid: msgstr } map that merge-batch.mjs folds into webhack.translations.json.
 *
 * Usage: node scripts/i18n/next-batch.mjs <scratchDir> [total=500] [groups=5] [lang=zh-CN]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const scratch = process.argv[2];
const total = parseInt(process.argv[3] || '500', 10);
const groups = parseInt(process.argv[4] || '5', 10);
const lang = process.argv[5] || 'zh-CN';
if (!scratch) { console.error('need scratchDir'); process.exit(1); }

const corpus = JSON.parse(fs.readFileSync(path.join(repoRoot, 'locales', 'webhack.corpus.json'), 'utf8'));
const trPath = path.join(repoRoot, 'locales', lang, 'webhack.translations.json');
const done = fs.existsSync(trPath) ? JSON.parse(fs.readFileSync(trPath, 'utf8')) : {};

const remaining = Object.keys(corpus).sort((a, b) => a.localeCompare(b)).filter(id => !(id in done));
const take = remaining.slice(0, total);
const per = Math.ceil(take.length / groups);
let written = 0;
for (let i = 0; i < groups; i++) {
  const slice = take.slice(i * per, (i + 1) * per);
  if (!slice.length) break;
  fs.writeFileSync(path.join(scratch, `po_batch_${i + 1}.json`), JSON.stringify(slice, null, 2));
  written++;
  console.log(`po_batch_${i + 1}.json: ${slice.length} msgids`);
}
console.log(`remaining untranslated: ${remaining.length} (took ${take.length} into ${written} files)`);
