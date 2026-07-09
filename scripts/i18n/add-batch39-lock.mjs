#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // lock.c — full-sentence door messages (msg -> pline1) + dustcloud fragments
  // that compose into the already-translated "%s springs up in the doorway, but %s."
  'The door locks!': '门锁上了！',
  'The door swings shut, and locks!': '门猛地关上并锁住了！',
  'The broken door reassembles and locks!': '破损的门重新组合并锁上了！',
  'A cloud of dust springs up and assembles itself into a door!': '一团尘云腾起，自行聚合成一扇门！',
  'The door unlocks!': '门解锁了！',
  'A cloud of dust': '一团尘云',
  'quickly dissipates': '迅速消散',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
