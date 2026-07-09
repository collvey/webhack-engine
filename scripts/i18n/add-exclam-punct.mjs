#!/usr/bin/env node
/*
 * WebHack i18n — localize the punctuation returned by exclam() (zap.c) and the
 * !canseemon fallback in uhitm.c. exclam() returns "?"/"."/"!" appended to hit
 * and damage lines ("You hit <mon>." etc.); in zh these must be full-width so
 * the line doesn't end in an ASCII "." after CJK. No standalone _("."/"!"/"?")
 * calls exist elsewhere, so these keys are collision-free. Idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = { '.': '。', '!': '！', '?': '？' };

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
