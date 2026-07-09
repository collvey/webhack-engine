#!/usr/bin/env node
/*
 * WebHack i18n — add tool-class base names to object-names.zh-CN.json (keyed by
 * ONAME). Excludes Figurine ("figurine of <monster>", composed elsewhere).
 * Idempotent; gen-c-objnames.mjs validates the ONAME keys against onames.h.
 *
 * Usage: node scripts/i18n/add-objnames-tools.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'webhack-client', 'public', 'data', 'object-names.zh-CN.json');

const add = {
  LARGE_BOX: '大箱子', CHEST: '大宝箱', ICE_BOX: '冰箱', SACK: '麻袋', OILSKIN_SACK: '油布袋',
  BAG_OF_HOLDING: '收纳袋', BAG_OF_TRICKS: '戏法袋', SKELETON_KEY: '万能钥匙',
  LOCK_PICK: '开锁器', CREDIT_CARD: '信用卡', TALLOW_CANDLE: '兽脂蜡烛', WAX_CANDLE: '蜡烛',
  BRASS_LANTERN: '黄铜提灯', OIL_LAMP: '油灯', MAGIC_LAMP: '魔法灯', EXPENSIVE_CAMERA: '昂贵相机',
  MIRROR: '镜子', CRYSTAL_BALL: '水晶球', LENSES: '眼镜', BLINDFOLD: '眼罩', TOWEL: '毛巾',
  SADDLE: '马鞍', LEASH: '拴绳', STETHOSCOPE: '听诊器', TINNING_KIT: '制罐工具',
  TIN_OPENER: '开罐器', CAN_OF_GREASE: '润滑油罐', MAGIC_MARKER: '魔法记号笔',
  LAND_MINE: '地雷', BEARTRAP: '捕熊夹', TIN_WHISTLE: '锡哨', MAGIC_WHISTLE: '魔法哨',
  WOODEN_FLUTE: '木笛', MAGIC_FLUTE: '魔法笛', TOOLED_HORN: '雕纹号角', FROST_HORN: '冰霜号角',
  FIRE_HORN: '火焰号角', HORN_OF_PLENTY: '丰饶之角', WOODEN_HARP: '木竖琴', MAGIC_HARP: '魔法竖琴',
  BELL: '铃铛', BUGLE: '军号', LEATHER_DRUM: '皮鼓', DRUM_OF_EARTHQUAKE: '地震鼓',
  PICK_AXE: '鹤嘴锄', GRAPPLING_HOOK: '抓钩', UNICORN_HORN: '独角兽之角',
  CANDELABRUM_OF_INVOCATION: '祈唤烛台', BELL_OF_OPENING: '开启之铃',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys (incl _comment): ${Object.keys(json).length}`);
