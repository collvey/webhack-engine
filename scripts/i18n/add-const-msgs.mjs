#!/usr/bin/env node
/*
 * WebHack i18n — translate common string-constant message formats now made
 * translatable by wrap-var-calls.mjs (they were plined via a bare identifier,
 * bypassing _()). Keyed by exact source-form string. Idempotent; specifier
 * counts match the English.
 *
 * Usage: node scripts/i18n/add-const-msgs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'But nothing else happens...': '但什么也没发生……',
  "don't have enough elbow-room to maneuver.": '没有足够的活动空间来施展。',
  'Not carrying anything': '没有携带任何东西',
  'You tin it, you bought it!': '你封装了它，就得买下它！',
  'sit on the %s.': '坐在%s上。',
  'a hollow sound.  This must be a secret %s!': '空洞的声音。这一定是个秘密%s！',
  'feel a malignant aura surround %s.': '感觉到一股恶性光环环绕着%s。',
  'produce a %s whistling sound.': '发出%s的哨声。',
  'produce a %s, sharp vibration.': '发出%s的尖锐震动。',
  'This cookie has a scrap of paper inside.': '这块饼干里有一张纸条。',
  'A cloud of %s smoke surrounds you...': '一团%s烟雾笼罩着你……',
  'Use the command #%s to %s.': '使用命令 #%s 来%s。',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
