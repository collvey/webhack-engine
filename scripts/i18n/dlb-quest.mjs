// Parser + writer for the `quest.dat` DLB member (role-quest dialogue).
//
// Format (compiled by util/makedefs.c do_questtxt, read by src/questpgr.c):
//   int32   n_classes                         (LE; =14: Arc..Wiz + "-" common)
//   char[3] id      × n_classes               (contiguous class-id tags)
//   int32   offset  × n_classes               (ABS file offset of each class hdr)
//   per class @offset:
//     int32 n_msg
//     struct qtmsg × n_msg   (20 bytes each, LE):
//        int32 msgnum; char delivery; <3 pad>; int32 offset,size,summary_size
//   text region: messages laid out class-then-msg order; each occupies
//     size + summary_size bytes at qtmsg.offset:  [full text][summary text]
//   All text is xcrypt'd PER LINE (split on '\n', encrypt each; '\n' passes
//   through unchanged, bitmask resets each line — same cipher as rumors).
//
// hdr_offset (start of class headers/text) = 4 + (3+4)*n_classes.
// Class offsets accumulate 4 + 20*n_msg. Message offsets accumulate
// size+summary_size, starting after all class headers.  (adjust_qt_hdrs)
import { xcrypt } from './dlb.mjs';

const LEN_HDR = 3;
const QTMSG_SIZE = 20; // int32 + char + 3pad + 3*int32

// Per-line xcrypt: split on 0x0A, encrypt each segment, rejoin. Symmetric
// (an involution) so decode and encode use the same routine.
export function xcryptLines(buf) {
  const parts = [];
  let start = 0;
  for (let i = 0; i <= buf.length; i++) {
    if (i === buf.length || buf[i] === 0x0a) {
      parts.push(xcrypt(buf.slice(start, i)));
      start = i + 1;
    }
  }
  // rejoin with 0x0A between the (segments count - 1) gaps
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) out.push(Buffer.from([0x0a]));
    out.push(parts[i]);
  }
  return Buffer.concat(out);
}

export function parseQuest(buf) {
  let p = 0;
  const i32 = () => { const v = buf.readInt32LE(p); p += 4; return v; };
  const nClasses = i32();
  const ids = [];
  for (let i = 0; i < nClasses; i++) { ids.push(buf.slice(p, p + LEN_HDR).toString('latin1').replace(/\0+$/, '')); p += LEN_HDR; }
  const classOffsets = [];
  for (let i = 0; i < nClasses; i++) classOffsets.push(i32());

  const classes = [];
  for (let c = 0; c < nClasses; c++) {
    let q = classOffsets[c];
    const nMsg = buf.readInt32LE(q); q += 4;
    const msgs = [];
    for (let m = 0; m < nMsg; m++) {
      const msgnum = buf.readInt32LE(q);
      const delivery = String.fromCharCode(buf[q + 4]);
      const offset = buf.readInt32LE(q + 8);
      const size = buf.readInt32LE(q + 12);
      const summarySize = buf.readInt32LE(q + 16);
      q += QTMSG_SIZE;
      const fullEnc = buf.slice(offset, offset + size);
      const summEnc = buf.slice(offset + size, offset + size + summarySize);
      msgs.push({
        msgnum, delivery,
        full: xcryptLines(fullEnc).toString('utf8'),
        summary: summarySize ? xcryptLines(summEnc).toString('utf8') : '',
      });
    }
    classes.push({ id: ids[c], msgs });
  }
  return { classes };
}

export function encodeQuest(parsed) {
  const { classes } = parsed;
  const n = classes.length;
  // Encrypt each message's text now so we know sizes.
  const enc = classes.map((cl) => cl.msgs.map((mm) => ({
    msgnum: mm.msgnum,
    delivery: mm.delivery,
    fullEnc: xcryptLines(Buffer.from(mm.full, 'utf8')),
    summEnc: mm.summary ? xcryptLines(Buffer.from(mm.summary, 'utf8')) : Buffer.alloc(0),
  })));

  // adjust_qt_hdrs: class header offsets
  let hdrOffset = 4 + (LEN_HDR + 4) * n;
  const classOffsets = [];
  for (let c = 0; c < n; c++) {
    classOffsets.push(hdrOffset);
    hdrOffset += 4 + QTMSG_SIZE * classes[c].msgs.length;
  }
  // message text offsets accumulate after all class headers
  let count = 0;
  const msgOffsets = enc.map((cl) => cl.map((e) => {
    const off = hdrOffset + count;
    count += e.fullEnc.length + e.summEnc.length;
    return off;
  }));

  // Emit: main header
  const parts = [];
  const hdr = Buffer.alloc(4 + LEN_HDR * n + 4 * n);
  let hp = 0;
  hdr.writeInt32LE(n, hp); hp += 4;
  for (let c = 0; c < n; c++) {
    const idb = Buffer.from(classes[c].id, 'latin1');
    idb.copy(hdr, hp, 0, Math.min(idb.length, LEN_HDR)); hp += LEN_HDR;
  }
  for (let c = 0; c < n; c++) { hdr.writeInt32LE(classOffsets[c], hp); hp += 4; }
  parts.push(hdr);

  // Class headers
  for (let c = 0; c < n; c++) {
    const msgs = classes[c].msgs;
    const cb = Buffer.alloc(4 + QTMSG_SIZE * msgs.length);
    cb.writeInt32LE(msgs.length, 0);
    for (let m = 0; m < msgs.length; m++) {
      const base = 4 + m * QTMSG_SIZE;
      cb.writeInt32LE(enc[c][m].msgnum, base);
      cb.writeUInt8(enc[c][m].delivery.charCodeAt(0), base + 4);
      // base+5..7 padding (already zero)
      cb.writeInt32LE(msgOffsets[c][m], base + 8);
      cb.writeInt32LE(enc[c][m].fullEnc.length, base + 12);
      cb.writeInt32LE(enc[c][m].summEnc.length, base + 16);
    }
    parts.push(cb);
  }
  // Text region
  for (let c = 0; c < n; c++)
    for (let m = 0; m < classes[c].msgs.length; m++) {
      parts.push(enc[c][m].fullEnc);
      if (enc[c][m].summEnc.length) parts.push(enc[c][m].summEnc);
    }
  return Buffer.concat(parts);
}
