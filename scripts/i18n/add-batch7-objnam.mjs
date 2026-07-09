#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  "; slippery)": "；滑手）",
  " (attached to %s)": "（拴在%s上）",
  "no": "没有",
  " (%s candle%s%s)": "（%s支蜡烛%s%s）",
  " attached": " 已安装",
  ", lit": "，已点燃",
  " (laid by you)": "（你所生）",
  " (%s, %s%ld %s)": "（%s，%s%ld %s）",
  "unpaid": "未付款",
  "contents": "内容物",
  "for sale": "待售",
  " (%sno charge)": "（%s免费）",
  " with text \"%s\"": "，上面写着“%s”",
  "book": "书",
  "novel": "小说",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
