#!/usr/bin/env node
/*
 * WebHack i18n — whistle sound-descriptor fragments (apply.c use_whistle /
 * use_magic_whistle). The formats ("produce a %s whistling sound." etc.) are
 * already translated; only the ternary fragments were bare English
 * ("你发出high的哨声。"). Idempotent. None of these words has a standalone
 * _() call elsewhere (verified) so the keys are collision-free.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'high': '高亢',
  'shrill': '尖锐',
  'normal': '普通',
  'strange': '奇怪',
  'frequency vibration': '频率振动',
  'pitched humming noise': '音调嗡嗡声',
  'strange, high-pitched': '奇怪的高音调',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
