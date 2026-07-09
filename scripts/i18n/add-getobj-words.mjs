#!/usr/bin/env node
/*
 * WebHack i18n — translate the getobj/ggetobj item-selection prompt ("What do
 * you want to %s?") and the action verbs interpolated into it. Composed as
 * "你想<verb>什么？". Idempotent.
 *
 * Usage: node scripts/i18n/add-getobj-words.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'What do you want to %s?': '你想%s什么？',
  'What kinds of thing do you want to %s? [%s]': '你想%s哪类东西？[%s]',
  /* getobj action verbs */
  'adjust': '调整', 'call': '命名', 'charge': '充能', 'dip': '浸入', 'drink': '喝下',
  'grease': '涂油于', 'invoke': '唤起', 'name': '命名', 'open': '打开', 'put on': '戴上',
  'read': '阅读', 'ready': '装填', 'remove': '摘下', 'rub': '摩擦', 'stash': '存放',
  'take off': '脱下', 'tip': '倾倒', 'untrap with': '解除陷阱用', 'use or apply': '使用',
  'wear': '穿戴', 'wield': '装备', 'write on': '书写于', 'write with': '书写用',
  'zap': '挥动', 'drop': '丢弃', 'identify': '鉴定',
  /* getobj menu section labels + xtra_choice hands/quiver options */
  'Miscellaneous': '杂项', 'Special': '特殊', '(list everything)': '（列出全部）',
  'your %s': '你的%s', 'your %s %s%s': '你的%s%s%s', 'empty quiver%s': '空箭袋%s',
  'gloved': '戴手套的', 'bare': '空', 'gloves': '手套', 'fingers': '手指',
  'fingertip': '指尖', ' (nothing readied)': '（未装填）',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
