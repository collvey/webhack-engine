#!/usr/bin/env node
/*
 * WebHack i18n — conservatively wrap message call sites in _().
 *
 * Transforms   FUNC("literal", ...)   ->   FUNC(_("literal"), ...)
 * for the message helpers whose FIRST argument is the format string. It ONLY
 * touches a call whose first argument is a SINGLE complete string literal
 * (immediately followed by ',' or ')'). It skips:
 *   - already-wrapped calls (FUNC(_(...))
 *   - non-literal first args (variables, buffers)
 *   - adjacent-concatenated literals ("a" "b") — too risky to place the ')'
 *
 * The English literal stays as the catalog key; _() falls back to English, so
 * unbaked strings are harmless. Build with emcc afterwards to verify.
 *
 * Usage: node scripts/i18n/wrap-calls.mjs [--apply] [file1.c file2.c ...]
 *   (no --apply = dry run: report counts only)
 *   (no files   = all src/*.c)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const apply = process.argv.includes('--apply');
const fileArgs = process.argv.slice(2).filter(a => a !== '--apply');

const FUNCS = ['pline', 'You', 'Your', 'You_feel', 'You_cant', 'pline_The',
               'There', 'You_hear', 'You_see', 'verbalize', 'Norep'];
const FUNC_SET = new Set(FUNCS);

const files = fileArgs.length
  ? fileArgs.map(f => path.resolve(repoRoot, f))
  : fs.readdirSync(path.join(repoRoot, 'src'))
      .filter(f => f.endsWith('.c'))
      .map(f => path.join(repoRoot, 'src', f));

const isIdent = c => /[A-Za-z0-9_]/.test(c);

// Read a C string literal starting at text[i] === '"'. Return end index (index
// of char after the closing quote) or -1 on malformed.
function readLiteral(text, i) {
  if (text[i] !== '"') return -1;
  i++;
  while (i < text.length) {
    if (text[i] === '\\') { i += 2; continue; }
    if (text[i] === '"') return i + 1;
    if (text[i] === '\n') return -1; // shouldn't happen in a single literal
    i++;
  }
  return -1;
}

let totalWrapped = 0;
const perFile = [];

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  let out = '';
  let pos = 0;
  let wrapped = 0;
  const re = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let m;
  let lastIndex = 0;
  // We rebuild the string as we go; use manual cursor to allow insertions.
  const edits = []; // {start,end,replacement}
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    if (!FUNC_SET.has(name)) continue;
    // ensure it's a call token, not part of a larger identifier handled by \b
    const parenPos = m.index + m[0].length - 1; // index of '('
    let j = parenPos + 1;
    while (j < text.length && /\s/.test(text[j])) j++;
    if (text[j] !== '"') continue; // first arg not a literal (or already _()
    const litStart = j;
    const litEnd = readLiteral(text, j);
    if (litEnd < 0) continue;
    // what follows the literal (skip ws)?
    let k = litEnd;
    while (k < text.length && /\s/.test(text[k])) k++;
    if (text[k] === '"') continue; // concatenated literal — skip
    if (text[k] !== ',' && text[k] !== ')') continue; // not a clean single arg
    // Wrap: literal span [litStart, litEnd) -> _( <literal> )
    edits.push({ start: litStart, end: litEnd });
  }
  if (edits.length) {
    // apply edits back-to-front to keep indices valid
    let result = text;
    for (let e = edits.length - 1; e >= 0; e--) {
      const { start, end } = edits[e];
      result = result.slice(0, start) + '_(' + result.slice(start, end) + ')' + result.slice(end);
    }
    text = result;
    wrapped = edits.length;
  }
  if (wrapped) {
    perFile.push([path.relative(repoRoot, file).replace(/\\/g, '/'), wrapped]);
    totalWrapped += wrapped;
    if (apply) fs.writeFileSync(file, text);
  }
}

perFile.sort((a, b) => b[1] - a[1]);
for (const [f, n] of perFile) console.log(`  ${String(n).padStart(4)}  ${f}`);
console.log(`${apply ? 'WRAPPED' : 'would wrap'}: ${totalWrapped} call sites across ${perFile.length} files`);
