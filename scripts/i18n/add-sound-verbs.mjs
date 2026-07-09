#!/usr/bin/env node
/*
 * WebHack i18n — add monster-sound fragments (sounds.c). These are bare English
 * verb literals substituted into the generic "%s %s" pline (Monnam + pline_msg)
 * or the MS_WERE full-moon line. The MS_WERE format is REWRITTEN to positional
 * args so the his/her possessive (%2$s = mhis) is dropped in Chinese. Idempotent.
 *
 * Usage: node scripts/i18n/add-sound-verbs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

/* new fragment keys */
const add = {
  'shriek': '尖啸',
  'howl': '嚎叫',
  'snarls.': '龇牙低吼。',
  'growls!': '低吼！',
  'roars!': '怒吼！',
  'drones.': '嗡嗡作响。',
  'buzzes angrily.': '愤怒地嗡嗡叫。',
  'whispers inaudibly.  All you can make out is "moon".':
    '含糊地低语着，你只能辨认出“月”字。',
  'Talk to whom? (in what direction)': '和谁交谈？（朝哪个方向）',
  'up': '向上',
};

/* formats to OVERWRITE (drop the his/her possessive via positional args) */
const overwrite = {
  '%s throws back %s head and lets out a blood curdling %s!':
    '%1$s猛地扬起头，发出令人毛骨悚然的%3$s！',
  // %s = up/向上 or down/向下; reword so the direction word slots naturally.
  "They won't hear you %s there.": '他们听不见你%s喊话。',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0, over = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
for (const [k, v] of Object.entries(overwrite)) {
  if (json[k] !== v) { json[k] = v; over++; }
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, overwrote ${over}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
