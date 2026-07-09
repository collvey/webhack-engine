#!/usr/bin/env node
/*
 * WebHack i18n — translate common in-game menu window titles (end_menu),
 * rendered by the frontend OptionListPanel (.option-list-title). Only the
 * manually-wrapped titles are listed here. Idempotent.
 *
 * Usage: node scripts/i18n/add-menu-titles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'What do you want to do?': '你想做什么？',
  'Loot which containers?': '搜刮哪些容器？',
  'Tip which container?': '倾倒哪个容器？',
  'Base Attributes': '基础属性',
  'Pick an object type to name': '选择要命名的物品类型',
  'What do you want to look at:': '你想查看什么：',
  'Select one item:': '选择一件物品：',
  'View known spells list sorted': '查看已知法术，排序方式',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
