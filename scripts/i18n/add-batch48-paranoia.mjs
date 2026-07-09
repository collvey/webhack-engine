#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // options.c paranoia[].explain — descriptions shown in the paranoia 'O'-menu
  'for "yes" confirmations, require "no" to reject': '对于“yes”确认，要求输入“no”才能拒绝',
  'yes vs y to quit or to enter explore mode': '退出或进入探索模式时用 yes 而非 y',
  'yes vs y to die (explore mode or debug mode)': '死亡时（探索或调试模式）用 yes 而非 y',
  'yes vs y to save bones data when dying in debug mode': '调试模式下死亡保存骸骨数据时用 yes 而非 y',
  'yes vs y to attack a peaceful monster': '攻击和平怪物时用 yes 而非 y',
  'yes vs y to break a wand via (a)pply': '通过(a)使用折断魔杖时用 yes 而非 y',
  'yes vs y to continue eating after first bite when satiated': '吃饱后第一口起继续进食时用 yes 而非 y',
  'yes vs y to change form when lycanthropy is controllable': '狼人变身可控时改变形态用 yes 而非 y',
  'y to pray (supersedes old "prayconfirm" option)': '祈祷用 y 确认（取代旧的“prayconfirm”选项）',
  'always pick from inventory for Remove and Takeoff': 'Remove 和 Takeoff 时总是从物品栏选择',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
