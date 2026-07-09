#!/usr/bin/env node
/*
 * WebHack i18n — do_wear.c already_wearing() family. Fixes the doubled 你你
 * prefix (the translated format wrongly carried a leading 你 that You() re-adds)
 * by keying the new "%s%s" format (was "%s%c") WITHOUT the prefix, and adds the
 * armor-category nouns that render via _(cc) inside already_wearing(). Idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  // format is preceded by You()'s 你 prefix — value must NOT start with 你
  'are already wearing %s%s': '已经穿着%s%s',
  'helm': '头盔',
  'hat': '帽子',
  'shirt': '衬衫',
  'robe': '长袍',
  'wrapping': '裹布',
  'smock': '罩衫',
  'some armor': '一些护甲',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
