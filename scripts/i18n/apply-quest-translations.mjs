// Apply zh-CN quest-dialogue translations into sys/wasm/nhdat's quest.dat member.
//
// Translations live in locales/zh-CN/dat/quest.json, keyed by "<classid>:<msgnum>"
// -> { full: "<zh text>", summary?: "<zh text>" }.  Only translated messages need
// be present; untranslated ones keep their English text.  All %X substitution
// codes (%H %C %d pronouns etc.) MUST be preserved verbatim inside translations.
//
// Usage: node scripts/i18n/apply-quest-translations.mjs [--write]
//   dry run: reports counts + re-parses output to verify each translated message
//            decodes back to the intended text.  --write persists to nhdat.
import fs from 'node:fs';
import { readDlb, writeDlb } from './dlb.mjs';
import { parseQuest, encodeQuest } from './dlb-quest.mjs';

const NHDAT = 'sys/wasm/nhdat';
const STORE = 'locales/zh-CN/dat/quest.json';
const write = process.argv.includes('--write');

const arc = readDlb(NHDAT);
const memberIdx = arc.entries.findIndex((e) => e.fname === 'quest.dat');
const parsed = parseQuest(arc.entries[memberIdx].data);
const tx = fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, 'utf8')) : {};

let applied = 0;
const intended = {}; // key -> {full, summary} we expect back after round-trip
for (const cl of parsed.classes) {
  for (const mm of cl.msgs) {
    const key = `${cl.id}:${mm.msgnum}`;
    const t = tx[key];
    if (!t) continue;
    if (typeof t.full === 'string') mm.full = t.full;
    if (typeof t.summary === 'string' && mm.summary) mm.summary = t.summary;
    intended[key] = { full: mm.full, summary: mm.summary };
    applied++;
  }
}
console.log(`quest.json keys: ${Object.keys(tx).length} | applied: ${applied}`);

const newMember = encodeQuest(parsed);
// Rebuild archive preserving member order.
const members = arc.entries
  .filter((e) => e.fname !== 'Directory')
  .map((e) => ({ fname: e.fname, data: e.fname === 'quest.dat' ? newMember : e.data }));
const out = writeDlb(members);

// Verify: re-parse the rebuilt member and confirm every translated message
// decodes to exactly the intended text.
const rb = parseQuest(newMember);
let ok = true;
for (const cl of rb.classes) for (const mm of cl.msgs) {
  const key = `${cl.id}:${mm.msgnum}`;
  if (!(key in intended)) continue;
  if (mm.full !== intended[key].full || mm.summary !== intended[key].summary) {
    console.error(`  VERIFY FAIL: ${key}`); ok = false;
  }
}
console.log(ok ? `  verify: all ${applied} translated messages decode OK` : '  verify: FAILED');
if (!ok) process.exit(1);

if (write) {
  fs.writeFileSync(NHDAT, out);
  console.log(`wrote ${NHDAT}`);
} else {
  console.log('dry run (pass --write to persist)');
}
