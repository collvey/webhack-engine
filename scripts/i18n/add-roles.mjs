#!/usr/bin/env node
/*
 * WebHack i18n — role / race / gender names + the welcome-back message. These
 * are interpolated into the welcome (allmain.c) and shown at death/overview.
 * Idempotent.
 *
 * Usage: node scripts/i18n/add-roles.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  /* welcome formats (arg order works in zh: greeting, name, [align/gender], race, role) */
  '%s %s, welcome to NetHack!  You are a%s %s %s.': '%s %s，欢迎来到NetHack！你是一位%s%s%s。',
  '%s %s, the%s %s %s, welcome back to NetHack!': '%s %s，%s%s%s，欢迎回到NetHack！',
  /* greetings */
  'Hello': '你好', 'Salutations': '致意',
  /* role names (m / f) */
  'Archeologist': '考古学家', 'Barbarian': '野蛮人', 'Caveman': '穴居人',
  'Cavewoman': '穴居女', 'Healer': '治疗者', 'Knight': '骑士', 'Monk': '武僧',
  'Priest': '牧师', 'Priestess': '女祭司', 'Ranger': '游侠', 'Rogue': '盗贼',
  'Samurai': '武士', 'Tourist': '游客', 'Valkyrie': '瓦尔基里', 'Wizard': '巫师',
  /* race adjectives */
  'human': '人类', 'elven': '精灵', 'dwarvish': '矮人', 'gnomish': '侏儒', 'orcish': '兽人',
  /* gender adjectives */
  'male': '男性', 'female': '女性',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
