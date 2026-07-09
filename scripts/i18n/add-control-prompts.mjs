#!/usr/bin/env node
/*
 * WebHack i18n — translate player-facing control prompts that were missed:
 *   - level_tele() destination prompt (reachable in NORMAL play with
 *     Teleport_control, not just wizard): the base prompt + non-wizard suffix
 *     were bare string literals (now _()-wrapped in src/teleport.c); the wizard
 *     suffix + "Go to Nowhere" confirm were wrapped but untranslated.
 *   - polyself controlled-polymorph prompt (reachable with Polymorph_control):
 *     "Become what kind of monster?" (already _()-wrapped, was untranslated).
 * Keyed by exact source string (source form). Idempotent.
 *
 * Usage: node scripts/i18n/add-control-prompts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  // level_tele() — Teleport_control path (normal play)
  'To what level do you want to teleport?': '你想传送到哪一层？',
  ' [type a number or name]': '（输入数字或名称）',
  ' [type a number, name, or ? for a menu]': '（输入数字、名称，或输入 ? 打开菜单）',
  'Go to Nowhere.  Are you sure?': '前往虚无之地。你确定吗？',
  // polyself — Polymorph_control path (normal play)
  'Become what kind of monster? [type the name]': '变成哪种怪物？[输入名称]',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
