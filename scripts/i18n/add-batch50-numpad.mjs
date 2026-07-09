#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // options.c number_pad npchoices[] — shown via add_menu(_(npchoices[i]))
  ' 0 (off)': ' 0（关闭）',
  ' 1 (on)': ' 1（开启）',
  ' 2 (on, MSDOS compatible)': ' 2（开启，MSDOS 兼容）',
  ' 3 (on, phone-style digit layout)': ' 3（开启，电话式数字布局）',
  ' 4 (on, phone-style layout, MSDOS compatible)': ' 4（开启，电话式布局，MSDOS 兼容）',
  "-1 (off, 'z' to move upper-left, 'y' to zap wands)": "-1（关闭，'z' 向左上移动，'y' 挥舞魔杖）",
  // othropt[].name — "other options" sub-menu entries
  'message types': '消息类型',
  'status hilite rules': '状态高亮规则',
  'Actions requiring extra confirmation:': '需要额外确认的操作：',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
