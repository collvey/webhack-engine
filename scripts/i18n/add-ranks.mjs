#!/usr/bin/env node
/*
 * WebHack i18n — rank titles. rank_of() returns are now _()-wrapped, so any
 * title is translatable. This fills the Healer ranks (the played role in the
 * test fixture) plus the generic "Player" fallback; the other roles' ~125 rank
 * titles remain English (bulk-fill future work — rarely-seen surface). Idempotent.
 *
 * Usage: node scripts/i18n/add-ranks.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'Player': '玩家',
  /* Healer ranks (role.c) */
  'Rhizotomist': '采药师', 'Empiric': '经验医师', 'Embalmer': '防腐师',
  'Dresser': '包扎师', 'Medicus ossium': '接骨医师', 'Medica ossium': '接骨女医',
  'Herbalist': '草药师', 'Magister': '医学硕士', 'Magistra': '医学女硕士',
  'Physician': '医师', 'Chirurgeon': '外科医师',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
