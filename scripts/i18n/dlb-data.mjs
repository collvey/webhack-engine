#!/usr/bin/env node
/*
 * WebHack i18n — parser/encoder for the DLB "data" member (the /-whatis
 * encyclopedia, compiled from dat/data.base by makedefs do_data). Lets us
 * translate encyclopedia entries and re-pack, recomputing the index offsets.
 *
 * Format (util/makedefs.c do_data; read by src/pager.c checkfile):
 *   line 0: raw Dont_Edit_Data header
 *   line 1: "%08lx\n" = txt_offset (absolute byte where the text section starts)
 *   index:  [byte after line1 .. txt_offset). A run of key lines (aliases,
 *           '*' wildcards, '~'-skip) followed by one "offset,count" line
 *           (offset = byte within text section, relative to txt_offset; count =
 *           # of text lines). Terminated by a line "." then "finaloffset,0".
 *   text:   [txt_offset .. end). Each entry = `count` consecutive lines; every
 *           text line carries a leading indent char (game displays buf+1).
 *
 * Offsets are relative to txt_offset, so translating text never changes them
 * circularly: rebuild text, compute each entry's cumulative offset, reformat
 * the index, then txt_offset = header_len + 9 + index_len.
 */
import fs from 'node:fs';

// Parse a raw `data` member Buffer into a structured, editable form.
export function parseData(buf) {
  const s = buf.toString('binary');
  const nl0 = s.indexOf('\n');
  const header = s.slice(0, nl0 + 1); // includes \n
  const nl1 = s.indexOf('\n', nl0 + 1);
  const txtOffset = parseInt(s.slice(nl0 + 1, nl1), 16);
  const indexStr = s.slice(nl1 + 1, txtOffset); // ends exactly at text start
  const textStr = s.slice(txtOffset);
  // Parse index into entries
  const indexLines = indexStr.split('\n');
  // trailing '' after final \n
  const entries = [];
  let keys = [];
  let terminator = null; // { finalOffset }
  for (let i = 0; i < indexLines.length; i++) {
    const line = indexLines[i];
    if (line === '') continue;
    if (line === '.') { // end marker; next line is "finaloffset,0"
      const m = indexLines[i + 1].match(/^(\d+),(\d+)$/);
      terminator = { finalOffset: parseInt(m[1], 10) };
      break;
    }
    const m = line.match(/^(\d+),(\d+)$/);
    if (m) {
      entries.push({ keys, offset: parseInt(m[1], 10), count: parseInt(m[2], 10) });
      keys = [];
    } else {
      keys.push(line);
    }
  }
  // Split text section into per-entry line arrays using offset+count.
  const textLines = textStr.split('\n');
  // Map byte offset -> line index for slicing
  for (const e of entries) {
    // find the line starting at byte e.offset
    // build cumulative byte map lazily below
  }
  // Build cumulative byte offsets of each text line
  const lineByteOffset = [];
  let acc = 0;
  for (const ln of textLines) { lineByteOffset.push(acc); acc += ln.length + 1; }
  const byteToLine = new Map(lineByteOffset.map((b, i) => [b, i]));
  for (const e of entries) {
    const startLine = byteToLine.get(e.offset);
    e.lines = textLines.slice(startLine, startLine + e.count);
  }
  return { header, txtOffset, entries, terminator, textStr };
}

// Serialize a parsed+possibly-edited structure back to a member Buffer.
export function encodeData(parsed) {
  const { header, entries, terminator } = parsed;
  // Rebuild text section from entries, assigning cumulative offsets.
  let text = '';
  const withOffsets = entries.map((e) => {
    const offset = text.length;
    const body = e.lines.join('\n') + '\n';
    text += body;
    return { keys: e.keys, offset, count: e.lines.length };
  });
  const finalOffset = text.length;
  // Build index string
  let index = '';
  for (const e of withOffsets) {
    for (const k of e.keys) index += k + '\n';
    index += `${e.offset},${e.count}\n`;
  }
  index += `.\n${finalOffset},0\n`;
  const txtOffset = Buffer.byteLength(header, 'binary') + 9 + Buffer.byteLength(index, 'binary');
  const line1 = txtOffset.toString(16).padStart(8, '0') + '\n';
  return Buffer.from(header + line1 + index + text, 'binary');
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('dlb-data.mjs')) {
  const [cmd, path] = process.argv.slice(2);
  const { readDlb } = await import('./dlb.mjs');
  const arc = readDlb(path || 'sys/wasm/nhdat');
  const raw = arc.entries.find((e) => e.fname === 'data').data;
  const parsed = parseData(raw);
  if (cmd === 'roundtrip') {
    const re = encodeData(parsed);
    console.log('entries:', parsed.entries.length, 'txtOffset:', parsed.txtOffset);
    console.log('orig size:', raw.length, 'reencoded:', re.length);
    console.log('byte-identical:', Buffer.compare(raw, re) === 0);
    if (Buffer.compare(raw, re) !== 0) {
      const n = Math.min(raw.length, re.length);
      let i = 0; for (; i < n; i++) if (raw[i] !== re[i]) break;
      console.log('first diff @', i, JSON.stringify(raw.slice(i, i + 40).toString('binary')),
        'vs', JSON.stringify(re.slice(i, i + 40).toString('binary')));
    }
  } else if (cmd === 'entry') {
    const key = process.argv[4];
    const e = parsed.entries.find((x) => x.keys.some((k) => k.replace(/[*~]/g, '') === key));
    console.log(JSON.stringify(e, null, 2));
  }
}
