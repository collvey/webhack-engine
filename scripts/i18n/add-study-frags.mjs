#!/usr/bin/env node
/*
 * WebHack i18n — spellbook study fragments (spell.c). Spell NAMES themselves are
 * already in the objname catalog and are now routed through nhi18n_objname (via
 * the spellname() macro + splname). This adds the remaining message fragments +
 * the splname quote wrappers. Keys with quotes use the C source form (\").
 * Formats emitted via You()/Your() must NOT carry the 你/你的 prefix. Idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'keener': '更精进',
  'restored': '已恢复',
  'recite': '诵读',
  'memorize': '记忆',
  'add %s to your repertoire.': '将%s加入了你的技能库。',
  'learn %s.': '学会了%s。',
  // splname quote wrappers — full-width quotes around the (localized) spell name
  '\\"%s\\"': '“%s”',
  'the \\"%s\\" spell': '“%s”法术',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
