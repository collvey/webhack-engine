#!/usr/bin/env node
/*
 * WebHack i18n — add wand EFFECT names to object-names.zh-CN.json (keyed by
 * WAN_* ONAME). Composed by xname() as "<effect>魔杖" for zh via
 * nhi18n_objclass_noun(). Idempotent; gen-c-objnames.mjs validates keys.
 *
 * Usage: node scripts/i18n/add-objnames-wands.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'webhack-client', 'public', 'data', 'object-names.zh-CN.json');

const add = {
  WAN_LIGHT: '光亮', WAN_SECRET_DOOR_DETECTION: '密门探测', WAN_ENLIGHTENMENT: '启蒙',
  WAN_CREATE_MONSTER: '创造怪物', WAN_WISHING: '许愿', WAN_NOTHING: '无效',
  WAN_STRIKING: '打击', WAN_MAKE_INVISIBLE: '隐形', WAN_SLOW_MONSTER: '减速怪物',
  WAN_SPEED_MONSTER: '加速怪物', WAN_UNDEAD_TURNING: '驱散亡灵', WAN_POLYMORPH: '变形',
  WAN_CANCELLATION: '取消', WAN_TELEPORTATION: '传送', WAN_OPENING: '开启',
  WAN_LOCKING: '上锁', WAN_PROBING: '探查', WAN_DIGGING: '挖掘',
  WAN_MAGIC_MISSILE: '魔法飞弹', WAN_FIRE: '火焰', WAN_COLD: '寒冷', WAN_SLEEP: '睡眠',
  WAN_DEATH: '死亡', WAN_LIGHTNING: '闪电',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys (incl _comment): ${Object.keys(json).length}`);
