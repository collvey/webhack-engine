#!/usr/bin/env node
/*
 * WebHack i18n — add monster-attacks-you combat message formats (mhitu.c) to
 * the C message catalog. These formats bake the verb into the format string
 * ("%s bites!"), so the whole format is translated; pfmt is now _()-wrapped at
 * the pline site. Idempotent.
 *
 * Usage: node scripts/i18n/add-mhitu.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  '%s bites!': '%s咬你！',
  '%s hits!': '%s击中你！',
  '%s stings!': '%s蜇你！',
  '%s butts!': '%s顶撞你！',
  '%s touches you!': '%s触碰你！',
  '%s tentacles suck you!': '%s的触手吸住你！',
  '%s explodes!': '%s爆炸了！',
  '%s kicks%c': '%s踢你%c',
  '%s %smisses!': '%s%s没打中！',
  'just ': '刚好',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
