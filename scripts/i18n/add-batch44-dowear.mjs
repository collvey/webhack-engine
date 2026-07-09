#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // do_wear.c — dressing/take-off messages, menu titles, blocking-armor template
  'You finish your dressing maneuver.': '你完成了穿衣动作。',
  'What type of things do you want to take off?': '你想脱下哪类东西？',
  'What do you want to take off?': '你想脱下什么？',
  'need to take off %s to %s %s.': '需要先脱下%s才能%s%s。',
  'an amulet': '一条护身符',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
