#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // levltyp[] — wizard #terrain base-36 legend (clean terrain-type words)
  '#terrain encodings:': '#terrain 编码：',
  'vertical wall': '竖直墙', 'horizontal wall': '水平墙',
  'top-left corner wall': '左上角墙', 'top-right corner wall': '右上角墙',
  'bottom-left corner wall': '左下角墙', 'bottom-right corner wall': '右下角墙',
  'cross wall': '十字墙', 'tee-up wall': 'T形上墙', 'tee-down wall': 'T形下墙',
  'tee-left wall': 'T形左墙', 'tee-right wall': 'T形右墙', 'drawbridge wall': '吊桥墙',
  'secret door': '暗门', 'secret corridor': '暗道',
  'drawbridge up': '升起的吊桥', 'lava pool': '熔岩池',
  'room': '房间', 'drawbridge down': '落下的吊桥',
  'unreachable/undiggable': '不可达/不可挖',
  // fallbacks (add only if missing)
  'pool': '水池', 'moat': '护城河', 'water': '水', 'iron bars': '铁栏',
  'corridor': '走廊', 'fountain': '喷泉', 'throne': '王座', 'sink': '水槽',
  'grave': '坟墓', 'altar': '祭坛', 'ice': '冰', 'air': '空气', 'cloud': '云',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
