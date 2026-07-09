#!/usr/bin/env node
/*
 * WebHack i18n — monster-action messages that previously shared the generic
 * "%s %s %s." format with a BARE English verb fragment (dogmove pet devours/eats,
 * makemon becomes/changes-into/grows-up, muse quaffs/eats). Each caller now uses
 * a DISTINCT verb-baked format so zh can order/de-space naturally. Idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  // dogmove — pet eats/devours an object
  '%s devours %s.': '%s吞食了%s。',
  '%s eats %s.': '%s吃掉了%s。',
  'It devours %s.': '它吞食了%s。',
  'It eats %s.': '它吃掉了%s。',
  // makemon — monster polymorph/growth
  '%s changes into %s.': '%s变成了%s。',
  '%s becomes %s.': '%s变成了%s。',
  '%s grows up into %s.': '%s成长为%s。',
  // muse — monster consumes a potion/food
  '%s quaffs %s.': '%s喝下了%s。',
  '%s opens and eats the contents of %s.': '%s打开并吃光了%s里的东西。',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
