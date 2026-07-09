#!/usr/bin/env node
/*
 * WebHack i18n — tainted-food type fragments (eat.c:1619 "Ulch - that %s was
 * tainted%s!"). The format is translated but the food-type ternary + cannibal
 * suffix were bare English ("那个glob被污染了！"). Idempotent; each frag has a
 * single _() use (verified) so keys are collision-free.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'fungoid vegetation': '真菌植物',
  'glob': '黏团',
  'protoplasm': '原生质',
  'meat': '肉',
  ', you cannibal': '，你这个食人者',
  /* potion.c:135 sickness worsening — restructured from "%s worse." + much/even */
  'much worse.': '难受多了。',
  'even worse.': '更难受了。',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
