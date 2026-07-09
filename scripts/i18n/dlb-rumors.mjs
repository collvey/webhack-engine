#!/usr/bin/env node
/*
 * WebHack i18n — parser/encoder for the DLB "rumors" member (fortune-cookie /
 * Oracle rumor pool, compiled by makedefs do_rumors, read by src/rumors.c).
 *
 * Format:
 *   line 0: raw Dont_Edit_Data header
 *   line 1: fixed-width offset header
 *     "%04d,%06ld,%06lx;%04d,%06ld,%06lx;0,0,%06lx\n"
 *     = tcount,tsize,tstart ; fcount,fsize,fstart ; 0,0,eof   (48 chars + \n)
 *   then: tcount xcrypt'd TRUE rumor lines, then fcount xcrypt'd FALSE lines.
 *   Each rumor line is padded with trailing '_' to PAD_RUMORS_TO=60 bytes
 *   (line incl \n) when shorter; the game strips trailing '_' on display.
 *   Offsets are absolute byte positions; sizes are section byte totals.
 *
 * Header fields are fixed width, so tstart is constant — translating rumor text
 * only changes sizes/offsets, which we recompute. xcrypt is byte-wise symmetric
 * so it round-trips UTF-8.
 */
import fs from 'node:fs';
import { xcrypt } from './dlb.mjs';

const PAD_RUMORS_TO = 60;

// Pad a rumor line (WITHOUT trailing \n) with '_' so that line+\n reaches
// PAD_RUMORS_TO bytes, matching makedefs. Returns the padded body (no \n).
export function padRumor(body) {
  // makedefs: len = strlen(line incl \n); pad while len < PAD_RUMORS_TO.
  let len = Buffer.byteLength(body, 'binary') + 1; // +1 for the \n
  let out = body;
  while (len < PAD_RUMORS_TO) { out += '_'; len++; }
  return out;
}

export function parseRumors(buf) {
  const s = buf.toString('binary');
  const nl0 = s.indexOf('\n');
  const header = s.slice(0, nl0 + 1);
  const nl1 = s.indexOf('\n', nl0 + 1);
  const hdr = s.slice(nl0 + 1, nl1);
  const m = hdr.match(/^(\d+),(\d+),([0-9a-f]+);(\d+),(\d+),([0-9a-f]+);0,0,([0-9a-f]+)$/);
  const tcount = +m[1], tstart = parseInt(m[3], 16), tsize = +m[2];
  const fcount = +m[4], fstart = parseInt(m[6], 16), fsize = +m[5];
  const eof = parseInt(m[7], 16);
  // Each rumor line is xcrypt'd SEPARATELY (bitmask resets per line), like the
  // game. '\n' is unchanged by xcrypt, so split on '\n' then decrypt each line.
  const decLines = (sec) => {
    const parts = sec.split('\n'); parts.pop(); // drop trailing '' after final \n
    return parts.map((l) => xcrypt(Buffer.from(l, 'binary')).toString('binary'));
  };
  const trueLines = decLines(s.slice(tstart, tstart + tsize));
  const falseLines = decLines(s.slice(fstart, fstart + fsize));
  return { header, tstart, trueLines, falseLines, tcount, fcount, eof };
}

// Serialize. trueLines/falseLines are rumor bodies WITHOUT trailing \n and
// WITHOUT padding (padding is (re)applied here). Header offsets recomputed.
export function encodeRumors(parsed) {
  const { header } = parsed;
  // xcrypt each padded line SEPARATELY (bitmask resets per line), then concat.
  const encSection = (lines) =>
    lines.map((l) => xcrypt(Buffer.from(padRumor(l) + '\n', 'binary'))).map((b) => b.toString('binary')).join('');
  const trueText = encSection(parsed.trueLines);
  const falseText = encSection(parsed.falseLines);
  const tsize = Buffer.byteLength(trueText, 'binary');
  const fsize = Buffer.byteLength(falseText, 'binary');
  // header line length is fixed (48) + \n; tstart = header.len + 49
  const headerLen = Buffer.byteLength(header, 'binary');
  const line1Len = 48 + 1;
  const tstart = headerLen + line1Len;
  const fstart = tstart + tsize;
  const eof = fstart + fsize;
  const hex6 = (n) => n.toString(16).padStart(6, '0');
  const d4 = (n) => String(n).padStart(4, '0');
  const d6 = (n) => String(n).padStart(6, '0');
  const line1 = `${d4(parsed.trueLines.length)},${d6(tsize)},${hex6(tstart)};`
    + `${d4(parsed.falseLines.length)},${d6(fsize)},${hex6(fstart)};0,0,${hex6(eof)}\n`;
  // trueText/falseText are ALREADY per-line encrypted.
  return Buffer.concat([Buffer.from(header + line1 + trueText + falseText, 'binary')]);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('dlb-rumors.mjs')) {
  const { readDlb } = await import('./dlb.mjs');
  const [cmd, path] = process.argv.slice(2);
  const arc = readDlb(path || 'sys/wasm/nhdat');
  const raw = arc.entries.find((e) => e.fname === 'rumors').data;
  const parsed = parseRumors(raw);
  if (cmd === 'roundtrip') {
    // Un-pad parsed lines first (parse keeps padding), so re-encode re-pads.
    const strip = (l) => l.replace(/_+$/, '');
    const p2 = { ...parsed, trueLines: parsed.trueLines.map(strip), falseLines: parsed.falseLines.map(strip) };
    const re = encodeRumors(p2);
    console.log(`true=${parsed.trueLines.length} false=${parsed.falseLines.length}`);
    console.log('orig size:', raw.length, 'reencoded:', re.length, 'identical:', Buffer.compare(raw, re) === 0);
    if (Buffer.compare(raw, re) !== 0) {
      const n = Math.min(raw.length, re.length); let i = 0; for (; i < n; i++) if (raw[i] !== re[i]) break;
      console.log('first diff @', i, JSON.stringify(raw.slice(i, i + 50).toString('binary')), 'vs', JSON.stringify(re.slice(i, i + 50).toString('binary')));
    }
  } else if (cmd === 'sample') {
    console.log('TRUE[0..3]:', JSON.stringify(parsed.trueLines.slice(0, 3).map((l) => l.replace(/_+$/, ''))));
    console.log('FALSE[0..3]:', JSON.stringify(parsed.falseLines.slice(0, 3).map((l) => l.replace(/_+$/, ''))));
  }
}
