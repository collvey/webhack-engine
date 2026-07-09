#!/usr/bin/env node
/*
 * WebHack i18n — wrap interactive-prompt calls in _(). getlin/yn/yn_function/
 * ynq/y_n take a user-facing prompt as their first string-literal arg but were
 * never wrapped. Transforms  FUNC("literal", ...) -> FUNC(_("literal"), ...)
 * (single complete literal only; skips already-wrapped and concatenated). Safe:
 * _() is a catalog lookup that returns English on a miss.
 *
 * Usage: node scripts/i18n/wrap-prompts.mjs [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const apply = process.argv.includes('--apply');
const FUNCS = new Set(['getlin', 'yn', 'yn_function', 'ynq', 'y_n', 'paranoid_query']);

function readLiteral(text, i) {
  if (text[i] !== '"') return -1;
  i++;
  while (i < text.length) {
    if (text[i] === '\\') { i += 2; continue; }
    if (text[i] === '"') return i + 1;
    if (text[i] === '\n') return -1;
    i++;
  }
  return -1;
}

let total = 0;
const perFile = [];
const samples = [];
for (const f of fs.readdirSync(path.join(repoRoot, 'src')).filter(f => f.endsWith('.c'))) {
  const file = path.join(repoRoot, 'src', f);
  const text = fs.readFileSync(file, 'utf8');
  const re = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let m; const edits = [];
  while ((m = re.exec(text)) !== null) {
    if (!FUNCS.has(m[1])) continue;
    let j = m.index + m[0].length;
    while (j < text.length && /\s/.test(text[j])) j++;
    if (text[j] !== '"') continue; // not a literal / already _()
    const litEnd = readLiteral(text, j);
    if (litEnd < 0) continue;
    let k = litEnd; while (k < text.length && /\s/.test(text[k])) k++;
    if (text[k] === '"') continue; // concatenated
    if (text[k] !== ',' && text[k] !== ')') continue;
    edits.push({ start: j, end: litEnd, fn: m[1], lit: text.slice(j, litEnd) });
  }
  if (edits.length) {
    let result = text;
    for (let e = edits.length - 1; e >= 0; e--) {
      const { start, end } = edits[e];
      result = result.slice(0, start) + '_(' + result.slice(start, end) + ')' + result.slice(end);
    }
    if (apply) fs.writeFileSync(file, result);
    perFile.push([f, edits.length]);
    total += edits.length;
    for (const e of edits) if (samples.length < 30) samples.push(`${f}: ${e.fn}(${e.lit})`);
  }
}
perFile.sort((a, b) => b[1] - a[1]);
for (const [f, n] of perFile) console.log(`  ${String(n).padStart(3)}  ${f}`);
console.log(`${apply ? 'WRAPPED' : 'would wrap'}: ${total} prompt sites`);
if (!apply) console.log('--- samples ---\n' + samples.join('\n'));
