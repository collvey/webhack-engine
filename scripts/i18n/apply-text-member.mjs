// Swap a plain-text DLB member (help, hh, cmdhelp, keyhelp, opthelp, wizhelp,
// history, license, porthelp, options) with a translated version from
// locales/zh-CN/dat/<member>.txt, preserving every other member byte-for-byte
// and in original order.
//
// Usage: node scripts/i18n/apply-text-member.mjs <member> [--write]
//   without --write: dry run, reports byte deltas + read-back verification
//   with    --write: overwrites sys/wasm/nhdat
//
// Plain-text members are stored raw (no xcrypt, no offset index) so the swap is
// a straight data replacement; writeDlb recomputes the directory offsets.
import fs from 'node:fs';
import { readDlb, writeDlb } from './dlb.mjs';

const NHDAT = 'sys/wasm/nhdat';
const member = process.argv[2];
const write = process.argv.includes('--write');
if (!member) {
  console.error('usage: node scripts/i18n/apply-text-member.mjs <member> [--write]');
  process.exit(1);
}
const srcPath = `locales/zh-CN/dat/${member}.txt`;
if (!fs.existsSync(srcPath)) {
  console.error(`missing translation file: ${srcPath}`);
  process.exit(1);
}

const arc = readDlb(NHDAT);
const target = arc.entries.find((e) => e.fname === member && e.fname !== 'Directory');
if (!target) {
  console.error(`member not found in archive: ${member}`);
  process.exit(1);
}

const newData = fs.readFileSync(srcPath); // raw bytes (UTF-8)
console.log(`member "${member}": ${target.size} bytes -> ${newData.length} bytes (${newData.length - target.size >= 0 ? '+' : ''}${newData.length - target.size})`);

// Rebuild member list in original order, excluding the Directory pseudo-entry.
const members = arc.entries
  .filter((e) => e.fname !== 'Directory')
  .map((e) => ({ fname: e.fname, data: e.fname === member ? newData : e.data }));

const out = writeDlb(members);

// Verify read-back: the swapped member decodes to exactly our new bytes, and
// every other member is byte-identical to before.
fs.writeFileSync(NHDAT + '.tmp', out);
const rb = readDlb(NHDAT + '.tmp');
let ok = true;
for (const e of arc.entries.filter((x) => x.fname !== 'Directory')) {
  const after = rb.entries.find((x) => x.fname === e.fname);
  const expect = e.fname === member ? newData : e.data;
  if (!after || Buffer.compare(after.data, expect) !== 0) {
    console.error(`  VERIFY FAIL: ${e.fname}`);
    ok = false;
  }
}
console.log(ok ? `  verify: all ${members.length} members read back OK` : '  verify: FAILED');

if (!ok) {
  fs.unlinkSync(NHDAT + '.tmp');
  process.exit(1);
}
if (write) {
  fs.renameSync(NHDAT + '.tmp', NHDAT);
  console.log(`wrote ${NHDAT}`);
} else {
  fs.unlinkSync(NHDAT + '.tmp');
  console.log('dry run (pass --write to persist)');
}
