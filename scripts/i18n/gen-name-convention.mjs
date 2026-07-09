#!/usr/bin/env node
/*
 * WebHack i18n — generate webhack-client/public/data/name-convention.json
 *
 * Diffs WebHack's zh-CN monster & item base-name translations against the
 * StackC00ki3 "Nethack-CN 5.0.0" community naming standard, surfacing every
 * name where the two disagree so a human can review and decide which wins.
 *
 * Reference tables live in ref/nethack-cn-5.0.0/ (fetched from
 *   https://github.com/StackC00ki3/Nethack-cn/tree/Nethack-CN-5.0.0/doc ).
 * We only compare names the CURRENT WebHack build actually has; entries that
 * exist only in the 5.0.0 standard (marked `5.0.0 新增`) are ignored.
 *
 * Join keys:
 *   monsters — PM_* (include/pm.h enum index) -> English (monster-data.json)
 *   objects  — ONAME (from src/objects.c macro name, class-prefixed for the
 *              ring/wand/scroll/potion/spellbook composition classes)
 *
 * Usage: node scripts/i18n/gen-name-convention.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = (...p) => path.join(repo, ...p);
const read = f => fs.readFileSync(f, 'utf8');
const readJSON = f => JSON.parse(read(f));

const monsRef = read(R('ref/nethack-cn-5.0.0/monsters_translation_standard_zh_cn.md'));
const objRef = read(R('ref/nethack-cn-5.0.0/objects_translation_standard_zh_cn.md'));

// ─────────────────────────── MONSTERS ───────────────────────────
// PM_* -> enum index (include/pm.h), then index -> English (monster-data.json)
const pmSrc = read(R('include/pm.h'));
const enumBody = pmSrc.slice(pmSrc.indexOf('enum monnums'), pmSrc.indexOf('};', pmSrc.indexOf('enum monnums')));
const pmIndex = {};
let cur = 0;
for (const line of enumBody.split('\n')) {
  const m = line.match(/\b(PM_[A-Z0-9_]+)\s*(=\s*(\d+))?/);
  if (!m) continue;
  if (m[3] !== undefined) cur = parseInt(m[3], 10);
  pmIndex[m[1]] = cur;
  cur++;
}
const monData = readJSON(R('webhack-client/public/data/monster-data.json'));
const pmEnglish = {};
for (const [pm, idx] of Object.entries(pmIndex)) if (monData[idx]) pmEnglish[pm] = monData[idx].name;

// Reference: english(lowercase) -> { zh, group, remark }.  The table has three
// gendered column-pairs (male/female/neutral); collect every non-`*` pair.
const monRefMap = {};
let monGroup = '';
for (const line of monsRef.split('\n')) {
  const h = line.match(/^####\s+(.+?)\s*$/);
  if (h) { monGroup = h[1]; continue; }
  if (!line.startsWith('|')) continue;
  const cells = line.split('|').slice(1, -1).map(c => c.trim());
  if (cells.length < 6 || cells[0] === '男性英文名' || cells[0].startsWith('---')) continue;
  const [me, mz, fe, fz, ne, nz, remark] = cells;
  for (const [en, zh] of [[me, mz], [fe, fz], [ne, nz]]) {
    if (!en || en === '*' || !zh || zh === '*') continue;
    monRefMap[en.trim().toLowerCase()] = { zh: zh.trim(), group: monGroup, remark: (remark || '').trim() };
  }
}

// Second reference: SunnyYuer NetHack-cn (Android 汉化版) C engine. Chinese name
// is the 2nd string arg of each MON() macro: MON("giant ant", "巨型蚂蚁", S_ANT, …).
const sunnyMonSrc = read(R('ref/nethack-cn-android/monst.c'));
const sunnyMon = {}; // english(lower) -> chinese
for (const m of sunnyMonSrc.matchAll(/MON\(\s*"([^"]*)"\s*,\s*"([^"]*)"/g)) {
  sunnyMon[m[1].trim().toLowerCase()] = m[2].trim();
}

const monZh = readJSON(R('webhack-client/public/data/monster-names.zh-CN.json'));
const monsters = { discrepancies: [], noRef: [], noEnglish: [] };
for (const [pm, zh] of Object.entries(monZh)) {
  const en = pmEnglish[pm];
  if (!en) { monsters.noEnglish.push({ key: pm, ours: zh }); continue; }
  const ref = monRefMap[en.toLowerCase()];
  const standard = ref ? ref.zh : null;
  const android = sunnyMon[en.toLowerCase()] ?? null;
  if (standard === null && android === null) { monsters.noRef.push({ key: pm, en, ours: zh }); continue; }
  const diffStd = standard !== null && standard !== zh;
  const diffAndroid = android !== null && android !== zh;
  if (diffStd || diffAndroid) {
    monsters.discrepancies.push({
      key: pm, en, ours: zh, standard, android,
      group: ref ? ref.group : 'S_?', remark: ref ? ref.remark : '',
      diffStd, diffAndroid, refsDisagree: standard !== null && android !== null && standard !== android,
    });
  }
}

// ─────────────────────────── OBJECTS ───────────────────────────
const OBJ_MACROS = ['OBJECT','WEAPON','PROJECTILE','BOW','WEPTOOL','ARMOR','CLOAK','HELM','BOOTS',
  'SHIELD','GLOVES','DRGN_ARMR','RING','AMULET','TOOL','CONTAINER','WAND','SPELL','SCROLL','POTION',
  'FOOD','GEM','ROCK','COIN'];
// Composition classes: objects.c holds the bare effect name; the ONAME carries a
// class prefix, and bare names collide across classes -> class-scoped lookup.
const MACRO_PREFIX = { RING: 'RIN', WAND: 'WAN', SCROLL: 'SCR', POTION: 'POT', SPELL: 'SPE' };
const CAT_PREFIX = { '戒指': 'RIN', '魔杖': 'WAN', '卷轴': 'SCR', '药水': 'POT', '魔法书': 'SPE' };
const OBJ_ONAME_ALIAS = {
  'cheap plastic imitation of the Amulet of Yendor': 'FAKE_AMULET_OF_YENDOR',
  'Book of the Dead': 'SPE_BOOK_OF_THE_DEAD',
  'novel': 'SPE_NOVEL',
};
// makedefs truncates over-long ONAMEs; map the truncated symbol back to its name.
const OBJ_ONAME_ENGLISH_FIX = { RIN_PROTECTION_FROM_SHAPE_CHAN: 'protection from shape changers' };
const norm = n => n.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Fallback grouping when the StackC00ki3 standard has no row for an object.
const MACRO_CAT = { WEAPON: '武器', PROJECTILE: '武器', BOW: '武器', WEPTOOL: '武器',
  ARMOR: '防具', CLOAK: '防具', HELM: '防具', BOOTS: '防具', SHIELD: '防具', GLOVES: '防具', DRGN_ARMR: '防具',
  RING: '戒指', AMULET: '护符', WAND: '魔杖', SCROLL: '卷轴', POTION: '药水', SPELL: '魔法书',
  TOOL: '工具', CONTAINER: '工具', FOOD: '食物', GEM: '宝石与石头', ROCK: '岩石', COIN: '金币', OBJECT: '杂项物体' };

const objectsSrc = read(R('src/objects.c'));
const macroRe = new RegExp('^(' + OBJ_MACROS.join('|') + ')\\(\\s*("([^"]*)"|OBJ\\("([^"]*)")');
const onameEnglish = { ...OBJ_ONAME_ENGLISH_FIX };
const onameClass = {}; // ONAME -> fallback category label, for grouping
for (const line of objectsSrc.split('\n')) {
  const m = line.match(macroRe);
  if (!m) continue;
  const macro = m[1], name = (m[3] ?? m[4] ?? '').trim();
  if (!name) continue;
  const oname = (MACRO_PREFIX[macro] && !OBJ_ONAME_ALIAS[name])
    ? MACRO_PREFIX[macro] + '_' + norm(name)
    : (OBJ_ONAME_ALIAS[name] || norm(name));
  if (!(oname in onameEnglish)) { onameEnglish[oname] = name; onameClass[oname] = MACRO_CAT[macro] || '杂项物体'; }
}

// Second reference: SunnyYuer NetHack-cn objects.c. Same MACRO("en","zh",…) shape;
// derive the same class-prefixed ONAME so we can join ONAME↔ONAME directly.
const sunnyObjSrc = read(R('ref/nethack-cn-android/objects.c'));
const sunnyObj = {}; // ONAME -> chinese
for (const line of sunnyObjSrc.split('\n')) {
  const m = line.match(macroRe);
  if (!m) continue;
  const macro = m[1];
  // capture english + chinese: either  OBJ("en", "zh"  or  "en", "zh"
  const mm = line.match(/^(?:[A-Z_]+)\(\s*(?:OBJ\(\s*)?"([^"]*)"\s*,\s*"([^"]*)"/);
  if (!mm) continue;
  const name = mm[1].trim(), zh = mm[2].trim();
  if (!name || !zh) continue;
  const oname = (MACRO_PREFIX[macro] && !OBJ_ONAME_ALIAS[name])
    ? MACRO_PREFIX[macro] + '_' + norm(name)
    : (OBJ_ONAME_ALIAS[name] || norm(name));
  if (!(oname in sunnyObj)) sunnyObj[oname] = zh;
}

// Reference: class-scoped for composition classes, global for direct classes.
const objRefMap = {};                                 // english -> { zh, group, remark }
const objRefByClass = { RIN: {}, WAN: {}, SCR: {}, POT: {}, SPE: {} };
let curClass = null, curCat = '', inUnid = false;
for (const line of objRef.split('\n')) {
  const h = line.match(/^###\s+(.+?)\s*$/);
  if (h) { curCat = h[1]; curClass = CAT_PREFIX[curCat] || null; inUnid = false; continue; }
  if (line.startsWith('####')) { inUnid = line.includes('未鉴定'); continue; }
  if (!line.startsWith('|')) continue;
  const cells = line.split('|').slice(1, -1).map(c => c.trim());
  if (cells.length < 2 || cells[0] === '英文' || cells[0].startsWith('---')) continue;
  const en = cells[0].toLowerCase(), zh = cells[1], remark = cells[2] || '';
  if (!en || !zh) continue;
  if (curClass) { if (inUnid) continue; objRefByClass[curClass][en] = { zh, group: curCat, remark }; }
  else { if (inUnid && en in objRefMap) continue; objRefMap[en] = { zh, group: curCat, remark }; }
}

const objZhRaw = readJSON(R('webhack-client/public/data/object-names.zh-CN.json'));
const objects = { discrepancies: [], noRef: [], noEnglish: [] };
for (const [oname, zh] of Object.entries(objZhRaw)) {
  if (oname === '_comment') continue;
  const en = onameEnglish[oname];
  if (!en) { objects.noEnglish.push({ key: oname, ours: zh }); continue; }
  const enl = en.toLowerCase();
  const prefix = oname.split('_')[0];
  const ref = (objRefByClass[prefix] && objRefByClass[prefix][enl]) || objRefMap[enl];
  const standard = ref ? ref.zh : null;
  const android = sunnyObj[oname] ?? null;
  if (standard === null && android === null) { objects.noRef.push({ key: oname, en, ours: zh }); continue; }
  const diffStd = standard !== null && standard !== zh;
  const diffAndroid = android !== null && android !== zh;
  if (diffStd || diffAndroid) {
    objects.discrepancies.push({
      key: oname, en, ours: zh, standard, android,
      group: ref ? ref.group : (onameClass[oname] || '杂项物体'), remark: ref ? ref.remark : '',
      diffStd, diffAndroid, refsDisagree: standard !== null && android !== null && standard !== android,
    });
  }
}

// ─────────────────────────── EMIT ───────────────────────────
const tally = (grp) => ({
  discrepancies: grp.discrepancies.length,
  vsStandard: grp.discrepancies.filter(d => d.diffStd).length,
  vsAndroid: grp.discrepancies.filter(d => d.diffAndroid).length,
  refsDisagree: grp.discrepancies.filter(d => d.refsDisagree).length,
});
const summary = {
  references: {
    standard: 'StackC00ki3/Nethack-cn @ Nethack-CN-5.0.0 · doc/{monsters,objects}_translation_standard_zh_cn.md (ref/nethack-cn-5.0.0/)',
    android: 'SunnyYuer/NetHack-cn @ NetHack-Android · NetHack/src/{monst,objects}.c (ref/nethack-cn-android/) — the C engine behind ref/NetHack-Android-master (sys/android windowport only)',
  },
  note: 'Three-way diff of the current WebHack build vs two community Chinese name sets. Only names the current build has are compared; 5.0.0-only additions are ignored. A name is listed if WebHack differs from EITHER reference.',
  monsters: {
    total: Object.keys(monZh).length,
    compared: Object.keys(monZh).length - monsters.noRef.length - monsters.noEnglish.length,
    ...tally(monsters),
  },
  objects: {
    total: Object.keys(objZhRaw).length - 1,
    compared: Object.keys(objZhRaw).length - 1 - objects.noRef.length - objects.noEnglish.length,
    ...tally(objects),
  },
};
const out = { summary, monsters, objects };
const outPath = R('webhack-client/public/data/name-convention.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${path.relative(repo, outPath)}`);
for (const [k, s] of [['monsters', summary.monsters], ['objects', summary.objects]]) {
  console.log(`  ${k}: ${s.discrepancies} listed / ${s.compared} compared  (vs标准 ${s.vsStandard}, vs安卓 ${s.vsAndroid}, 两参考不一致 ${s.refsDisagree})`);
}
