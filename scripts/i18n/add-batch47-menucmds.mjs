#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // options.c default_menu_cmd_info[].desc — shown in the "Menu control keys:" help
  'Go to first page': '转到第一页',
  'Go to last page': '转到最后一页',
  'Go to next page': '转到下一页',
  'Go to previous page': '转到上一页',
  'Select all items': '选择所有项',
  'Unselect all items': '取消选择所有项',
  'Invert selection': '反转选择',
  'Select items in current page': '选择当前页的项',
  'Unselect items in current page': '取消选择当前页的项',
  'Invert current page selection': '反转当前页的选择',
  'Search and toggle matching items': '搜索并切换匹配的项',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
