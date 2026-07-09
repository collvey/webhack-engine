// apply-oracles-translations.mjs — swap translated blocks into the DLB 'oracles' member.
//
// Reads locales/zh-CN/dat/oracles.json ({ "<idx>": [lines...] }), replaces those blocks in the
// existing member (keeps untranslated blocks byte-for-byte), recomputes offsets, and writes nhdat.
// Enforces the COLNO=80 line ceiling (<=78 UTF-8 bytes/line) so outoracle's dlb_fgets never splits
// a multi-byte char. Verifies the re-encoded member re-parses and that only intended blocks changed.
//
// usage: node scripts/i18n/apply-oracles-translations.mjs [--write] [nhdat-path]

import { readFileSync, writeFileSync } from 'fs';
import { readDlb, writeDlb } from './dlb.mjs';
import { parseOracles, encodeOracles } from './dlb-oracles.mjs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const path = args.find((a) => !a.startsWith('--')) || 'sys/wasm/nhdat';

const trans = JSON.parse(readFileSync('locales/zh-CN/dat/oracles.json', 'utf8'));

const r = readDlb(path);
const oraIdx = r.entries.findIndex((x) => x.fname === 'oracles');
if (oraIdx < 0) throw new Error('no oracles member in ' + path);
const parsed = parseOracles(r.entries[oraIdx].data);

const MAXLINE = 78; // COLNO(80) - 1 for NUL, minus 1 slack; content lines must be <= this many bytes
let changed = 0;
const problems = [];
const newBlocks = parsed.blocks.map((orig, i) => {
  const key = String(i);
  if (!(key in trans)) return orig; // leave untranslated blocks intact
  const lines = trans[key];
  if (!Array.isArray(lines)) { problems.push(`block ${i}: not an array`); return orig; }
  for (const ln of lines) {
    const b = Buffer.byteLength(ln, 'utf8');
    if (b > MAXLINE) problems.push(`block ${i}: line ${b}B > ${MAXLINE}B: ${JSON.stringify(ln)}`);
    if (ln === '---') problems.push(`block ${i}: a line is literally "---" (separator collision)`);
  }
  changed++;
  return lines;
});

if (problems.length) {
  console.error('CONSTRAINT VIOLATIONS:\n' + problems.join('\n'));
  process.exit(1);
}

const newMember = encodeOracles({ header: parsed.header, blocks: newBlocks });

// verify: re-parse the new member and confirm each translated block matches, untranslated unchanged
const reparsed = parseOracles(newMember);
let verifyFail = 0;
for (let i = 0; i < parsed.blocks.length; i++) {
  const want = String(i) in trans ? trans[String(i)] : parsed.blocks[i];
  const got = reparsed.blocks[i];
  if (JSON.stringify(want) !== JSON.stringify(got)) { verifyFail++; console.error(`block ${i} verify MISMATCH`); }
}
console.log(`blocks: ${parsed.blocks.length}, translated: ${changed}, verify failures: ${verifyFail}`);
console.log(`member size: ${r.entries[oraIdx].data.length}B -> ${newMember.length}B`);
if (verifyFail) process.exit(1);

if (write) {
  const members = r.entries.filter((e) => e.fname !== 'Directory').map((e) => ({
    fname: e.fname,
    data: e.fname === 'oracles' ? newMember : e.data,
  }));
  writeFileSync(path, writeDlb(members));
  // round-trip readback sanity
  const rb = readDlb(path);
  const ok = rb.entries.length === r.entries.length;
  console.log(`wrote ${path}; members after: ${rb.entries.length} (${ok ? 'OK' : 'COUNT MISMATCH'})`);
} else {
  console.log('(dry run — pass --write to update nhdat)');
}
