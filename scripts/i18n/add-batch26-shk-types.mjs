#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // shtypes[].name — shop-type names shown in "You enter <shk>'s <type>!" etc.
  'general store': '杂货店',
  'used armor dealership': '二手护甲行',
  'second-hand bookstore': '旧书店',
  'liquor emporium': '美酒商行',
  'antique weapons outlet': '古董武器行',
  'delicatessen': '熟食店',
  'jewelers': '珠宝店',
  'quality apparel and accessories': '高档服饰店',
  'hardware store': '五金店',
  'rare books': '珍本书店',
  'health food store': '保健食品店',
  'lighting store': '灯具店',
  // shop-closed engraving
  'Closed for inventory': '因盘点停业',
  // escaped-source forms for #ifdef-only shktools names (tracker keys the escaped literal)
  "Evad\\'kh": '埃瓦德赫',
  "Nosid-da\\'r": '诺西德达尔',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
