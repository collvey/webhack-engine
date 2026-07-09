#!/usr/bin/env node
/*
 * WebHack i18n — wrap message calls whose format arg is a bare identifier
 * (a string constant / buffer), which the literal-only wrap-calls.mjs missed.
 *
 *   FUNC(ident, ...)   ->   FUNC(_(ident), ...)
 *
 * for the message helpers whose FIRST arg is the format string. Only touches a
 * call whose first argument is a single bare identifier immediately followed by
 * ',' or ')'. Skips already-wrapped calls and anything with '.', '->', '[' etc.
 * _(ident) is nhi18n_gettext(ident): a runtime catalog lookup that returns the
 * English string unchanged on a miss, so this is always safe.
 *
 * Usage: node scripts/i18n/wrap-var-calls.mjs [--apply] [file...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const apply = process.argv.includes('--apply');
const fileArgs = process.argv.slice(2).filter(a => a !== '--apply');

const FUNCS = ['pline', 'You', 'Your', 'You_feel', 'You_cant', 'pline_The',
               'There', 'You_hear', 'You_see', 'verbalize', 'Norep'];
// identifiers that are NOT translatable message formats (loop vars, buffers we
// must not treat as catalog keys, known non-message args)
const SKIP_IDENTS = new Set(['buf', 'fmt', 'bp', 'tmp', 'str', 's', 'p', 'q']);

const files = fileArgs.length
  ? fileArgs.map(f => path.resolve(repoRoot, f))
  : fs.readdirSync(path.join(repoRoot, 'src')).filter(f => f.endsWith('.c'))
      .map(f => path.join(repoRoot, 'src', f));

const re = new RegExp('\\b(' + FUNCS.join('|') + ')\\(\\s*([a-z_][a-zA-Z0-9_]*)\\s*([,)])', 'g');
let total = 0;
const perFile = [];
const samples = [];

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  let count = 0;
  const out = text.replace(re, (m, fn, ident, tail) => {
    if (SKIP_IDENTS.has(ident)) return m;
    count++;
    if (samples.length < 30) samples.push(`${path.basename(file)}: ${fn}(${ident}${tail}`);
    return `${fn}(_(${ident})${tail}`;
  });
  if (count) {
    perFile.push([path.relative(repoRoot, file).replace(/\\/g, '/'), count]);
    total += count;
    if (apply) fs.writeFileSync(file, out);
  }
}
perFile.sort((a, b) => b[1] - a[1]);
for (const [f, n] of perFile) console.log(`  ${String(n).padStart(3)}  ${f}`);
console.log(`${apply ? 'WRAPPED' : 'would wrap'}: ${total} sites across ${perFile.length} files`);
if (!apply) { console.log('--- samples ---'); console.log(samples.join('\n')); }
