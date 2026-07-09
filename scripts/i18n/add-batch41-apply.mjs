#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // apply.c — static const char[] messages shown via pline/You/verbalize(_(var))
  "There's not enough room here to use that.": '这里没有足够的空间来使用它。',
  'Where do you want to hit?': '你想击打哪里？',
  "won't hit anything if you can't see that spot.": '看不见那个位置就打不中任何东西。',
  "can't reach that spot from here.": '从这里够不到那个位置。',
  'You tin it, you bought it!': '你把它做成了罐头，就得买下它！',
  'But nothing else happens...': '但没有别的事发生……',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
