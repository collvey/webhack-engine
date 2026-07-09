#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // Hello() greetings (in-game monster/shopkeeper hellos)
  'Irasshaimase': '欢迎光临', 'Konnichi wa': '午安', 'Hallo': '哈啰', 'Velkommen': '欢迎',
  // character-selection prompts / labels / menu
  'Shall I pick a character for you? [ynaq] ': '要我为你挑选一个角色吗？[ynaq] ',
  'Shall I pick ': '要我挑选',
  'alignment': '阵营',
  ' for you? [ynaq] ': '给你吗？[ynaq] ',
  'name:': '名称：', 'role:': '职业：', 'race:': '种族：', 'gender:': '性别：', 'alignment:': '阵营：',
  '%4s%s forces %s': '%4s%s强制为%s',
  'Pick%s %s first': '请先选择%s%s', ' another': '另一个',
  'Reset role/race/&c filtering': '重置职业/种族/等筛选',
  'Random': '随机', 'Quit': '退出',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
