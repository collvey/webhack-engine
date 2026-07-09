#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // pray.c — standalone full-sentence messages (cure reasons, prayer finish, godvoice)
  'You feel more limber.': '你感觉灵活多了。',
  'The slime disappears.': '黏液消失了。',
  'You finish your prayer.': '你结束了祈祷。',
  'Vile creature, thou durst call upon me?': '卑劣的生物，你竟敢召唤我？',
  'Walk no more, perversion of nature!': '不许再行走，自然的悖逆之物！',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
