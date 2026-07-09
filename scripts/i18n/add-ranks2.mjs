#!/usr/bin/env node
/*
 * WebHack i18n — rank titles for popular roles (Wizard / Valkyrie / Barbarian).
 * Hand-picked actual rank titles only (NOT god names, role codes, or quest
 * place names, which are interspersed in role.c and must stay as-is).
 * rank_of() returns are _()-wrapped, so these translate at display. Idempotent.
 *
 * Usage: node scripts/i18n/add-ranks2.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  /* Wizard */
  'Evoker': '咒术师', 'Conjurer': '召唤师', 'Thaumaturge': '奇术师', 'Magician': '魔法师',
  'Enchanter': '施魔者', 'Enchantress': '女施魔者', 'Sorcerer': '术士', 'Sorceress': '女术士',
  'Necromancer': '死灵法师', 'Mage': '法师',
  /* Valkyrie */
  'Stripling': '少年武士', 'Skirmisher': '散兵', 'Fighter': '战士',
  'Man-at-arms': '武装战士', 'Woman-at-arms': '武装女战士', 'Warrior': '勇士',
  'Swashbuckler': '剑客', 'Hero': '英雄', 'Heroine': '女英雄', 'Champion': '勇者',
  'Lord': '领主', 'Lady': '夫人',
  /* Barbarian */
  'Plunderer': '掠夺者', 'Plunderess': '女掠夺者', 'Pillager': '劫掠者', 'Bandit': '强盗',
  'Brigand': '土匪', 'Raider': '袭击者', 'Reaver': '劫掠者', 'Slayer': '杀戮者',
  'Chieftain': '酋长', 'Chieftainess': '女酋长', 'Conqueror': '征服者', 'Conqueress': '女征服者',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
