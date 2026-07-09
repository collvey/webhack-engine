#!/usr/bin/env node
/*
 * WebHack i18n — translate the whatis (do_look) menu option strings, now
 * _()-wrapped in src/pager.c. Keyed by exact source string. Idempotent.
 * Usage: node scripts/i18n/add-whatis-menu.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'something on the map': '地图上的某物',
  "something you're carrying": '你携带的某物',
  'something else (by symbol or name)': '其他（按符号或名称）',
  'nearby monsters': '附近的怪物',
  'all monsters shown on map': '地图上显示的所有怪物',
  'nearby objects': '附近的物品',
  'all objects shown on map': '地图上显示的所有物品',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
