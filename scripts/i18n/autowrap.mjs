#!/usr/bin/env node
/*
 * WebHack i18n — AUTO-WRAP unwrapped user-facing string literals in _().
 *
 * Scans genuine message emitters (pline/You/Your/…) and wraps every translatable
 * string-literal argument that isn't already inside _(). This is the mechanical
 * half of localization; the resulting _("...") with no catalog entry renders
 * English exactly as before (nhi18n_gettext returns the key), so wrapping is
 * render-safe — only the catalog translations change what the player sees.
 *
 * Usage:
 *   node scripts/i18n/autowrap.mjs --dry [--file src/eat.c]   # count only
 *   node scripts/i18n/autowrap.mjs [--file src/eat.c]         # write changes
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const only = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;

const MSG_FUNCS = [
  'pline', 'Norep', 'You', 'Your', 'You_feel', 'You_cant', 'pline_The',
  'There', 'You_hear', 'You_see', 'verbalize', 'custompline', 'urgent_pline',
  'pline_dir', 'You1', 'Your1', 'pline_xy',
];
const DEV = new Set(['impossible', 'panic', 'warning', 'raw_printf', 'debugpline']);
const FUNC_RE = new RegExp('\\b(' + [...MSG_FUNCS, ...DEV].join('|') + ')\\s*\\(', 'g');

// Return a same-length copy with // and /* */ comments and char-literals
// replaced by spaces (newlines kept), string literals preserved. Offsets match
// the original so edits computed on the mask apply cleanly to the source.
function maskComments(t) {
  const a = t.split(''); let i = 0;
  const blank = k => { if (a[k] !== '\n') a[k] = ' '; };
  while (i < t.length) {
    const c = t[i], n = t[i + 1];
    if (c === '"') { // string: skip contents (keep as-is)
      i++; while (i < t.length && t[i] !== '"') { if (t[i] === '\\') i++; i++; } i++; continue;
    }
    if (c === "'") { blank(i); i++; while (i < t.length && t[i] !== "'") { if (t[i] === '\\') { blank(i); i++; } blank(i); i++; } if (i < t.length) blank(i); i++; continue; }
    if (c === '/' && n === '/') { while (i < t.length && t[i] !== '\n') { blank(i); i++; } continue; }
    if (c === '/' && n === '*') { blank(i); blank(i + 1); i += 2; while (i < t.length && !(t[i] === '*' && t[i + 1] === '/')) { blank(i); i++; } if (i < t.length) { blank(i); blank(i + 1); i += 2; } continue; }
    i++;
  }
  return a.join('');
}
function isTranslatable(s) {
  const stripped = s.replace(/%[-+ 0-9.*#lhjzt$]*[a-zA-Z]/g, '').replace(/\\[nt"]/g, '');
  return /[A-Za-z]{2,}/.test(stripped);
}
// balanced call range from '(' at open
function callEnd(t, open) {
  let d = 0, s = false, c = false;
  for (let i = open; i < t.length; i++) {
    const ch = t[i];
    if (s) { if (ch === '\\') i++; else if (ch === '"') s = false; continue; }
    if (c) { if (ch === '\\') i++; else if (ch === "'") c = false; continue; }
    if (ch === '"') s = true; else if (ch === "'") c = true;
    else if (ch === '(') d++;
    else if (ch === ')') { d--; if (d === 0) return i; }
  }
  return -1;
}
// find literal groups within [from,to); returns [{start,end,value,wrapped}]
function literals(t, from, to) {
  const out = [];
  for (let i = from; i < to; i++) {
    if (t[i] !== '"') continue;
    const start = i; let val = '', j = i;
    while (j < to && t[j] === '"') {
      j++;
      while (j < to && t[j] !== '"') { if (t[j] === '\\') { val += t[j] + (t[j + 1] || ''); j += 2; } else { val += t[j]; j++; } }
      j++;
      let k = j; while (k < to && /\s/.test(t[k])) k++;
      if (t[k] === '"') { j = k; continue; }
      break;
    }
    let b = start - 1; while (b >= 0 && /\s/.test(t[b])) b--;
    const wrapped = b >= 1 && t[b] === '(' && t[b - 1] === '_';
    out.push({ start, end: j, value: val, wrapped });
    i = j - 1;
  }
  return out;
}

let files = fs.readdirSync(path.join(repoRoot, 'src')).filter(f => f.endsWith('.c')).map(f => 'src/' + f);
if (only) files = [only.replace(/\\/g, '/')];

let totalWrapped = 0, filesChanged = 0;
for (const rel of files) {
  const full = path.join(repoRoot, rel);
  let text = fs.readFileSync(full, 'utf8');
  const masked = maskComments(text); // scan this; edit `text`
  const ranges = []; // {start,end} of literals to wrap
  let m; FUNC_RE.lastIndex = 0;
  while ((m = FUNC_RE.exec(masked)) !== null) {
    const isDev = DEV.has(m[1]);
    const open = m.index + m[0].length - 1;
    const end = callEnd(masked, open);
    if (end < 0) { FUNC_RE.lastIndex = open + 1; continue; }
    if (!isDev) {
      for (const lit of literals(masked, open, end + 1)) {
        if (lit.wrapped || !isTranslatable(lit.value)) continue;
        ranges.push({ start: lit.start, end: lit.end });
      }
    }
    FUNC_RE.lastIndex = end + 1;
  }
  if (!ranges.length) continue;
  // de-dup + sort descending so insertions don't shift earlier offsets
  const uniq = [...new Map(ranges.map(r => [r.start + ':' + r.end, r])).values()]
    .sort((a, b) => b.start - a.start);
  for (const r of uniq) {
    text = text.slice(0, r.start) + '_(' + text.slice(r.start, r.end) + ')' + text.slice(r.end);
  }
  totalWrapped += uniq.length; filesChanged++;
  if (!DRY) fs.writeFileSync(full, text);
  if (only || uniq.length > 20) console.log((DRY ? '[dry] ' : '') + rel + ': wrap ' + uniq.length);
}
console.log((DRY ? '[DRY RUN] ' : '') + 'wrapped ' + totalWrapped + ' literals across ' + filesChanged + ' files');
