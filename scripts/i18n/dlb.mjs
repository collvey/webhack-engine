#!/usr/bin/env node
/*
 * WebHack i18n — pure-Node reader/writer for the NetHack DLB archive (nhdat).
 * Lets us localize the packed data files (bogusmon/epitaph/engrave/oracles/…)
 * WITHOUT the MSVC makedefs+dlb_main toolchain: unpack, edit a member, repack.
 *
 * DLB v1 format (see src/dlb.c readlibdir):
 *   header:    "%ld %ld %ld %ld %ld\n" = rev nentries strsize liboffset totalsize
 *   directory: nentries lines of "%c%s %ld\n" = handling fname foffset(absolute)
 *   data:      raw member bytes concatenated starting at liboffset
 *   member size = next.foffset - this.foffset (last uses totalsize).
 *
 * xcrypt (src/hacklib.c) is a symmetric cipher applied per-line by makedefs to
 * the "random access" flavor files; decrypt == encrypt.
 */
import fs from 'node:fs';

export function xcrypt(buf) {
  // Operates on a Buffer of one logical string's bytes; symmetric.
  const out = Buffer.from(buf);
  let bitmask = 1;
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (c & (32 | 64)) out[i] = c ^ bitmask;
    bitmask <<= 1;
    if (bitmask >= 32) bitmask = 1;
  }
  return out;
}

export function readDlb(path) {
  const buf = fs.readFileSync(path);
  // Parse header line
  const nl = buf.indexOf(0x0a);
  const header = buf.slice(0, nl).toString('ascii').trim().split(/\s+/).map(Number);
  const [rev, nentries, strsize, liboffset, totalsize] = header;
  if (rev !== 1) throw new Error('unsupported DLB rev ' + rev);
  // Parse directory: nentries lines of "%c%s %ld\n"
  let pos = nl + 1;
  const entries = [];
  for (let i = 0; i < nentries; i++) {
    const eol = buf.indexOf(0x0a, pos);
    const line = buf.slice(pos, eol).toString('ascii');
    const handling = line[0];
    const parts = line.slice(1).trim().split(/\s+/);
    const foffset = Number(parts.pop());
    const fname = parts.join(' ');
    entries.push({ handling, fname, foffset });
    pos = eol + 1;
  }
  // Compute sizes and slice data
  for (let i = 0; i < entries.length; i++) {
    const end = i === entries.length - 1 ? totalsize : entries[i + 1].foffset;
    entries[i].size = end - entries[i].foffset;
    entries[i].data = buf.slice(entries[i].foffset, end);
  }
  return { rev, strsize, liboffset, totalsize, entries };
}

// Serialize an archive back to bytes. `members` = [{fname, data:Buffer}] in
// order (the "Directory" pseudo-entry is regenerated, do NOT pass it in).
// Reproduces util/dlb_main.c write_dlb_directory exactly:
//   header  "%3ld %8ld %8ld %8ld %8ld\n" = vers nentries strsize liboffset totalsize
//   entry   "%c%s %8ld\n"                = 'n' fname absOffset
export function writeDlb(members) {
  const DIRNAME = 'Directory';
  const nfiles = members.length;
  const nentries = nfiles + 1; // + Directory
  const slen = members.reduce((s, m) => s + Buffer.byteLength(m.fname), 0);
  const strsize = slen + DIRNAME.length + nfiles + 1;
  const pad8 = (n) => String(n).padStart(8, ' ');
  // liboffset = byte length of header line + all directory lines (fixed-width offsets)
  const headerLine = (total) =>
    `${String(1).padStart(3, ' ')} ${pad8(nentries)} ${pad8(strsize)} ${pad8(liboffset)} ${pad8(total)}\n`;
  const dirLine = (fname, off) => `n${fname} ${pad8(off)}\n`;
  let liboffset = 0;
  liboffset += Buffer.byteLength(headerLine(0)); // header fixed 40 bytes
  liboffset += Buffer.byteLength(dirLine(DIRNAME, 0));
  for (const m of members) liboffset += Buffer.byteLength(dirLine(m.fname, 0));
  // Compute absolute member offsets and total size
  let off = liboffset;
  const offs = members.map((m) => { const o = off; off += m.data.length; return o; });
  const totalsize = off;
  // Emit
  const parts = [Buffer.from(headerLine(totalsize), 'binary')];
  parts.push(Buffer.from(dirLine(DIRNAME, 0), 'binary'));
  members.forEach((m, i) => parts.push(Buffer.from(dirLine(m.fname, offs[i]), 'binary')));
  for (const m of members) parts.push(m.data);
  return Buffer.concat(parts);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('dlb.mjs')) {
  const [cmd, path, member] = process.argv.slice(2);
  const arc = readDlb(path);
  if (cmd === 'list') {
    console.log(`rev=${arc.rev} entries=${arc.entries.length} liboffset=${arc.liboffset} total=${arc.totalsize}`);
    for (const e of arc.entries)
      console.log(`  [${e.handling}] ${e.fname.padEnd(14)} off=${e.foffset} size=${e.size}`);
  } else if (cmd === 'cat') {
    const e = arc.entries.find((x) => x.fname === member);
    if (!e) throw new Error('no member ' + member);
    // decrypt each line with xcrypt
    const lines = e.data.toString('binary').split('\n');
    const dec = lines.map((l) => xcrypt(Buffer.from(l, 'binary')).toString('binary'));
    process.stdout.write(dec.join('\n'));
  }
}
