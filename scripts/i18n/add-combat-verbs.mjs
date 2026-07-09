#!/usr/bin/env node
/*
 * WebHack i18n — add player melee attack verbs to the C message catalog. These
 * are interpolated as %s into the core hit line (uhitm.c), which the zh branch
 * composes as "你<verb><mon>。". Idempotent.
 *
 * Usage: node scripts/i18n/add-combat-verbs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'hit': '击中', 'bite': '咬', 'sting': '蜇', 'attack': '攻击',
  'bash': '猛击', 'smite': '重击', 'kill': '杀死', 'destroy': '摧毁',
  /* monster-vs-monster 3rd-person verbs (mhitm.c) */
  'bites': '咬', 'stings': '蜇', 'butts': '顶撞', 'touches': '触碰',
  'hits': '击中', 'squeezes': '挤压', 'tentacles suck': '的触手吸住',
  /* monster death (monkilled, mon.c) */
  'killed': '被杀死', 'destroyed': '被摧毁', ' by the ': '，被', 'misses': '没打中',
  'swallows': '吞下',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
