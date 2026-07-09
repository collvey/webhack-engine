#!/usr/bin/env node
/*
 * WebHack i18n — regenerate a DLB "random access flavor" member (bogusmon/
 * epitaph/engrave) from a translated source .txt, replicating makedefs
 * do_rnd_access_file, then repack it into sys/wasm/nhdat via scripts/i18n/dlb.mjs.
 *
 * Member layout (validated byte-identical against the English original):
 *   line 0: raw Dont_Edit_Data header (NOT xcrypt'd), preserved from the
 *           existing member so spacing matches exactly.
 *   then:   xcrypt(default_content) with NO trailing newline, immediately
 *           followed by xcrypt(line + "\n") for each non-'#'/non-blank source
 *           line (grep0 #ifdef processing is a no-op for these files).
 *
 * Usage: node scripts/i18n/gen-dlb-flavor.mjs <member> <src.txt> [--write]
 *   member: bogusmon | epitaph | engrave
 *   without --write: dry run (reports sizes / line counts), does not touch nhdat
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDlb, writeDlb, xcrypt } from './dlb.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NHDAT = path.join(repoRoot, 'sys', 'wasm', 'nhdat');
const DEFAULTS = { bogusmon: 'grue', epitaph: 'No matter where I went, here I am.',
                   engrave: 'No matter where you go, there you are.' };

function contentLines(txt) {
  return txt.split('\n').filter((l) => l !== '' && l[0] !== '#');
}

export function encodeFlavor(headerBuf, deflt, srcTxt) {
  const parts = [headerBuf, xcrypt(Buffer.from(deflt, 'binary'))];
  for (const line of contentLines(srcTxt))
    parts.push(xcrypt(Buffer.from(line + '\n', 'binary')));
  return Buffer.concat(parts);
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('gen-dlb-flavor.mjs');
if (!isMain) { /* imported for encodeFlavor */ }
else {
const [member, srcPath, flag] = process.argv.slice(2);
if (!member || !srcPath) {
  console.error('usage: gen-dlb-flavor.mjs <member> <src.txt> [--write]');
  process.exit(1);
}
const arc = readDlb(NHDAT);
const old = arc.entries.find((e) => e.fname === member);
if (!old) throw new Error('no member ' + member);
const nl = old.data.indexOf(0x0a);
const header = old.data.slice(0, nl + 1);
// src is read as latin1 but our zh files are UTF-8 — use utf8 bytes preserved via binary
const srcTxt = fs.readFileSync(path.resolve(repoRoot, srcPath), 'utf8');
// sanity: content-line count vs English original (for pool-size awareness)
const enTxt = fs.readFileSync(path.join(repoRoot, 'dat', member + '.txt'), 'utf8');
console.log(`content lines: en=${contentLines(enTxt).length} zh=${contentLines(srcTxt).length}`);
// Build member: xcrypt operates on raw UTF-8 bytes (multibyte CJK bytes have bit
// 32/64 set variably; xcrypt is byte-wise & symmetric, so decode round-trips).
const newData = encodeFlavor(header, DEFAULTS[member],
  Buffer.from(srcTxt, 'utf8').toString('binary'));
console.log(`member ${member}: old=${old.data.length}B new=${newData.length}B`);
if (flag === '--write') {
  const members = arc.entries.filter((e) => e.fname !== 'Directory')
    .map((e) => ({ fname: e.fname, data: e.fname === member ? newData : e.data }));
  fs.writeFileSync(NHDAT, writeDlb(members));
  console.log('wrote sys/wasm/nhdat');
}
}
