#!/usr/bin/env node
/*
 * WebHack i18n — compile the translated message catalog into a compact runtime
 * artifact the WASM/C backend can load: a flat { msgid: msgstr } JSON shipped in
 * the client's public/data so it's fetchable at runtime (via the worker glue or
 * Emscripten FS). Only non-empty translations are included; missing ids fall
 * back to English in nhi18n_gettext().
 *
 * Data-only (no C build). Verify by inspecting the emitted JSON + counts.
 *
 * Usage: node scripts/i18n/compile-catalog.mjs [lang=zh-CN]
 * Output: webhack-client/public/data/nethack-messages.<lang>.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lang = process.argv[2] || 'zh-CN';

const trPath = path.join(repoRoot, 'locales', lang, 'webhack.translations.json');
const translations = JSON.parse(fs.readFileSync(trPath, 'utf8'));

// Keep only non-empty msgstr; keys are the English msgids (with C escapes),
// exactly as the C runtime will pass them to nhi18n_gettext() for lookup.
const catalog = {};
let n = 0;
for (const [msgid, msgstr] of Object.entries(translations)) {
  if (typeof msgstr === 'string' && msgstr.trim()) { catalog[msgid] = msgstr; n++; }
}

const outDir = path.join(repoRoot, 'webhack-client', 'public', 'data');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `nethack-messages.${lang}.json`);
// Compact (no pretty-print) to minimize the shipped artifact.
fs.writeFileSync(outPath, JSON.stringify(catalog));

const bytes = fs.statSync(outPath).size;
console.log(`compiled message catalog (${lang}): ${n} entries, ${(bytes / 1024).toFixed(1)} KB`);
console.log(`  → webhack-client/public/data/nethack-messages.${lang}.json`);
