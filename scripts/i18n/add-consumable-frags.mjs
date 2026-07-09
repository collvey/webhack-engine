#!/usr/bin/env node
/*
 * WebHack i18n — consumable-use fragments surfaced by the read-scroll + quaff
 * scrape: read.c scroll-read lines, potion.c booze/fruit-juice "tastes like"
 * fragments, and the do_name.c docall() "Call <obj>:" naming prompt (fires when
 * an unidentified item stays unidentified after use). Idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  /* read.c scroll-read */
  'You read the scroll.': '你读了卷轴。',
  'As you read the scroll, it disappears.': '你读卷轴时，它便消失了。',
  'You %s the formula on the scroll.': '你%s卷轴上的咒文。',
  'As you %s the formula on it, the scroll disappears.': '你%s其上的咒文时，卷轴便消失了。',
  'cogitate': '默想',
  'pronounce': '念诵',
  /* potion.c booze + fruit juice */
  'watered down ': '稀释的',
  'dandelion wine': '蒲公英酒',
  'liquid fire': '液态火',
  'overripe': '熟透的',
  'rotten': '腐烂的',
  'reconstituted ': '复原的',
  'This tastes like 10%% real %s%s all-natural beverage.': '这尝起来像含10%%真实%s%s的纯天然饮料。',
  'This tastes like %s%s.': '这尝起来像%s%s。',
  /* do_name.c docall() "Call <obj>:" naming prompt */
  'Call ': '称呼',
  ':': '：',
  'thing': '东西',
  'Call a stream of %s fluid:': '称呼一股%s液体：',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
