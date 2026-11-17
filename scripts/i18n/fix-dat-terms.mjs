#!/usr/bin/env node
/*
 * WebHack i18n — replace terms inside the translated DLB members of
 * sys/wasm/nhdat.zh-CN (rumors, quest.dat, oracles, data) and in their JSON
 * sources under locales/zh-CN/dat/, so a terminology change does not require
 * regenerating the whole archive. Each member is decoded and re-encoded with
 * its own codec (dlb-*.mjs), so offsets/padding/encryption stay valid.
 *
 *   node scripts/i18n/fix-dat-terms.mjs [--write]
 *
 * Edit TERMS below. Dry run prints per-member counts; --write persists.
 * Added for collvey/WebHack#16 (one transliteration of "Yendor": 岩德).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDlb, writeDlb } from './dlb.mjs';
import { parseRumors, encodeRumors } from './dlb-rumors.mjs';
import { parseQuest, encodeQuest } from './dlb-quest.mjs';
import { parseOracles, encodeOracles } from './dlb-oracles.mjs';
import { parseData, encodeData } from './dlb-data.mjs';

// [regex, replacement] applied in order to every translated string.
const TERMS = [
  [/雅顿(\\n|\n)?魔符/g, '岩德$1护身符'],      // the Amulet of Yendor (quest text)
  [/(雅顿|延德)(魔法师|法师|术士)/g, '岩德巫师'], // the Wizard of Yendor
  [/延德护身符/g, '岩德护身符'],
  [/延德的士兵/g, '岩德的士兵'],
  [/雅顿|延德|延都|延多/g, '岩德'],
];
const fix = (s) => TERMS.reduce((acc, [re, to]) => acc.replace(re, to), s);
const fixBin = (s) => Buffer.from(fix(Buffer.from(s, 'binary').toString('utf8')), 'utf8').toString('binary');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NHDAT = path.join(root, 'sys', 'wasm', 'nhdat.zh-CN');
const write = process.argv.includes('--write');
const arc = readDlb(NHDAT);
const member = (name) => arc.entries.find((e) => e.fname === name);
let total = 0;
// Guard: every codec must reproduce its member byte-for-byte before we edit it.
for (const [name, parse, encode] of [['rumors', parseRumors, encodeRumors], ['quest.dat', parseQuest, encodeQuest], ['oracles', parseOracles, encodeOracles], ['data', parseData, encodeData]]) {
  const d = Buffer.from(member(name).data);
  if (!Buffer.from(encode(parse(d))).equals(d)) { console.error('codec round-trip mismatch for ' + name + '; aborting'); process.exit(1); }
}
const count = (a, b) => { if (a !== b) total++; return a !== b; };

// rumors: lines are UTF-8 bytes held as 'binary' strings
{
  const e = member('rumors');
  const p = parseRumors(Buffer.from(e.data));
  let n = 0;
  for (const k of ['trueLines', 'falseLines']) p[k] = p[k].map((l) => { const s = l.replace(/_+$/, ''); const t = fixBin(s); if (count(s, t)) n++; return t; });
  e.data = encodeRumors(p); console.log('rumors:', n);
}
// quest.dat: full/summary are utf8 strings
{
  const e = member('quest.dat');
  const p = parseQuest(Buffer.from(e.data));
  let n = 0;
  for (const cl of p.classes) for (const m of cl.msgs) {
    const f = fix(m.full); if (count(m.full, f)) { n++; m.full = f; }
    if (m.summary) { const s = fix(m.summary); if (count(m.summary, s)) { n++; m.summary = s; } }
  }
  e.data = encodeQuest(p); console.log('quest.dat:', n);
}
// oracles: blocks of utf8 lines
{
  const e = member('oracles');
  const p = parseOracles(Buffer.from(e.data));
  let n = 0;
  p.blocks = p.blocks.map((b) => b.map((l) => { const t = fix(l); if (count(l, t)) n++; return t; }));
  e.data = encodeOracles(p); console.log('oracles:', n);
}
// data (encyclopedia): plain text lines held as 'binary'
{
  const e = member('data');
  const p = parseData(Buffer.from(e.data));
  let n = 0;
  for (const en of p.entries) en.lines = en.lines.map((l) => { const t = fixBin(l); if (count(l, t)) n++; return t; });
  e.data = encodeData(p); console.log('data:', n);
}
// JSON sources
for (const f of ['quest.json', 'rumors.json', 'oracles.json', 'data.json']) {
  const fp = path.join(root, 'locales', 'zh-CN', 'dat', f);
  const before = fs.readFileSync(fp, 'utf8');
  const after = fix(before);
  console.log(`${f}: ${before === after ? 'unchanged' : 'updated'}`);
  if (write && before !== after) fs.writeFileSync(fp, after);
}
console.log(`${total} strings changed${write ? '' : ' (dry run)'}`);
if (write) fs.writeFileSync(NHDAT, writeDlb(arc.entries.filter((e) => e.fname !== 'Directory').map((e) => ({ fname: e.fname, data: e.data }))));
