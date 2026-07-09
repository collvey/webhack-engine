#!/usr/bin/env node
/*
 * WebHack i18n — fix multi-%s message translations whose Chinese word order
 * differs from the English argument order. The auto-translation kept plain %s
 * in reordered text, which silently swaps the interpolated values. Rewrite them
 * with POSIX positional specifiers (%1$s, %2$s, ...) so each value lands in the
 * right slot. Idempotent (only sets the listed keys).
 *
 * Usage: node scripts/i18n/fix-arg-order.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

// key (English, source form) -> corrected zh with positional args.
// English "hit %s with %s." = hit <mon:%1> with <weapon:%2>; zh wants weapon first.
const fixes = {
  'hit %s with %s.': '用%2$s击中%1$s。', // 用<weapon>击中<mon>。
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let changed = 0;
for (const [k, v] of Object.entries(fixes)) {
  if (json[k] !== v) { json[k] = v; changed++; console.log('fixed', JSON.stringify(k), '->', v); }
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Updated ${changed} entries.`);
