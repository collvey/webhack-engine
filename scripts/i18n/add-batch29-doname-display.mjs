#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  'unknown': '未知',
  'desired location': '目标位置',
  'Wibbly Wobbly': '温布利·沃布利',
  // getpos target-limiting filter messages
  'Not limiting targets': '不限制目标',
  'Limiting targets to those in sight': '仅限视野内的目标',
  'Limiting targets to those in same area': '仅限同一区域内的目标',
  // ghost / monster naming
  '%s ghost': '%s的鬼魂',
  '%s called %s': '%s，名为%s',
  '%s of %s': '%s之%s',
  'bogon': '博贡',
  // impossible()/debug placeholders
  '[Null monster]': '[空怪物]',
  '[Null mon->data]': '[空 mon->data]',
  '[Invalid mon->data %s < %s]': '[无效 mon->data %s < %s]',
  '[Invalid mon->data %s >= %s]': '[无效 mon->data %s >= %s]',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
