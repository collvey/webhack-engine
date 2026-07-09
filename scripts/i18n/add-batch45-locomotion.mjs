#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
// mondata.c locomotion/stagger verb tables — both lowercase and capitalized forms
// map to the same zh (zh has no case). Returned via locomotion()/stagger().
const pairs = {
  float: '漂浮', wobble: '摇晃', fly: '飞行', flutter: '扑动',
  stagger: '踉跄', slither: '滑行', falter: '蹒跚', ooze: '渗流',
  tremble: '颤动', wiggle: '扭动', pulsate: '搏动', crawl: '爬行',
};
const add = {};
for (const [en, zh] of Object.entries(pairs)) {
  add[en] = zh;
  add[en[0].toUpperCase() + en.slice(1)] = zh; // capitalized variant
}
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
