#!/usr/bin/env node
/*
 * WebHack i18n — zap/beam hit fragments (zap.c hit()/miss() + the getdir default
 * prompt). zap_type_text ("wand"/"spell") is now _()-wrapped at its assignment;
 * add "spell" (wand already present). The hit() formats render "The <obj> hits
 * <mon>." — drop the English word-order spaces via positional args in zh. Also
 * the core "In what direction?" getdir prompt (cmd.c). Idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'spell': '法术',
  'In what direction?': '朝哪个方向？',
};
// drop the spaces (all args are CJK: The(obj) + hits + mon + punct). zap.c-only.
const overwrite = {
  '%s %s %s%s': '%1$s%2$s%3$s%4$s',
  '%s %s it.': '%1$s%2$s它。',
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
