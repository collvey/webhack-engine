#!/usr/bin/env node
/*
 * WebHack i18n — end-game / death screen strings (end.c): the death
 * announcement, disclosure prompts, paranoid confirmations, and the vanquished
 * summary. Idempotent.
 *
 * Usage: node scripts/i18n/add-endgame.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'turn to stone...': '石化……',
  'die...': '死去……',
  'Do you want to see what you had when you %s?': '你想看看你%s时拥有的东西吗？',
  'quit': '退出',
  'died': '死亡',
  'Do you want your possessions identified?': '你想鉴定你的所有物品吗？',
  'Continue eating?': '继续吃吗？',
  'Really quit?': '真的要退出吗？',
  'Die?': '去死吗？',
  'Remain in beast form?': '保持野兽形态吗？',
  'Save bones?': '保存骸骨？',
  '%ld creatures vanquished.': '共消灭%ld只生物。',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
