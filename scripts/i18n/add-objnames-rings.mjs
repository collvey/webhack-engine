#!/usr/bin/env node
/*
 * WebHack i18n — add ring EFFECT names to object-names.zh-CN.json (keyed by
 * RIN_* ONAME). These are the OBJ_NAME (the part after "ring of "), composed by
 * xname() as "<effect>戒指" for zh via nhi18n_objclass_noun(). Idempotent;
 * gen-c-objnames.mjs validates the keys against onames.h.
 *
 * Usage: node scripts/i18n/add-objnames-rings.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'webhack-client', 'public', 'data', 'object-names.zh-CN.json');

const add = {
  RIN_ADORNMENT: '装饰', RIN_GAIN_STRENGTH: '增力', RIN_GAIN_CONSTITUTION: '增体质',
  RIN_INCREASE_ACCURACY: '增命中', RIN_INCREASE_DAMAGE: '增伤害', RIN_PROTECTION: '保护',
  RIN_REGENERATION: '再生', RIN_SEARCHING: '探索', RIN_STEALTH: '潜行',
  RIN_SUSTAIN_ABILITY: '保持能力', RIN_LEVITATION: '漂浮', RIN_HUNGER: '饥饿',
  RIN_AGGRAVATE_MONSTER: '激怒怪物', RIN_CONFLICT: '冲突', RIN_WARNING: '警告',
  RIN_POISON_RESISTANCE: '抗毒', RIN_FIRE_RESISTANCE: '抗火', RIN_COLD_RESISTANCE: '抗寒',
  RIN_SHOCK_RESISTANCE: '抗电', RIN_FREE_ACTION: '自由行动', RIN_SLOW_DIGESTION: '缓慢消化',
  RIN_TELEPORTATION: '传送', RIN_TELEPORT_CONTROL: '传送控制', RIN_POLYMORPH: '变形',
  RIN_POLYMORPH_CONTROL: '变形控制', RIN_INVISIBILITY: '隐形', RIN_SEE_INVISIBLE: '视隐形',
  RIN_PROTECTION_FROM_SHAPE_CHAN: '防变形者',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys (incl _comment): ${Object.keys(json).length}`);
