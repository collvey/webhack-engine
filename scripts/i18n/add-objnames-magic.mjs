#!/usr/bin/env node
/*
 * WebHack i18n — add amulet (full names), scroll/potion/spellbook EFFECT names
 * to object-names.zh-CN.json (keyed by ONAME). Amulets are direct-name (oc_name
 * already includes "amulet of X"); scrolls/potions/spellbooks are effect-only,
 * composed as "<effect><noun>" for zh via nhi18n_objclass_noun(). Idempotent;
 * gen-c-objnames.mjs validates the keys against onames.h.
 *
 * Usage: node scripts/i18n/add-objnames-magic.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'webhack-client', 'public', 'data', 'object-names.zh-CN.json');

const add = {
  /* AMULET — full names (direct) */
  AMULET_OF_ESP: '心灵感应护身符', AMULET_OF_LIFE_SAVING: '救命护身符',
  AMULET_OF_STRANGULATION: '窒息护身符', AMULET_OF_RESTFUL_SLEEP: '安眠护身符',
  AMULET_VERSUS_POISON: '抗毒护身符', AMULET_OF_CHANGE: '变性护身符',
  AMULET_OF_UNCHANGING: '不变护身符', AMULET_OF_REFLECTION: '反射护身符',
  AMULET_OF_MAGICAL_BREATHING: '魔法呼吸护身符', AMULET_OF_YENDOR: '延德护身符',
  /* SCROLL effects */
  SCR_ENCHANT_ARMOR: '强化护甲', SCR_DESTROY_ARMOR: '摧毁护甲', SCR_CONFUSE_MONSTER: '迷惑怪物',
  SCR_SCARE_MONSTER: '惊吓怪物', SCR_REMOVE_CURSE: '解除诅咒', SCR_ENCHANT_WEAPON: '强化武器',
  SCR_CREATE_MONSTER: '创造怪物', SCR_TAMING: '驯服', SCR_GENOCIDE: '灭绝', SCR_LIGHT: '光亮',
  SCR_TELEPORTATION: '传送', SCR_GOLD_DETECTION: '金币探测', SCR_FOOD_DETECTION: '食物探测',
  SCR_IDENTIFY: '鉴定', SCR_MAGIC_MAPPING: '魔法地图', SCR_AMNESIA: '失忆', SCR_FIRE: '火焰',
  SCR_EARTH: '大地', SCR_PUNISHMENT: '惩罚', SCR_CHARGING: '充能', SCR_STINKING_CLOUD: '臭云',
  SCR_BLANK_PAPER: '空白纸',
  /* POTION effects */
  POT_GAIN_ABILITY: '增强能力', POT_RESTORE_ABILITY: '恢复能力', POT_CONFUSION: '混乱',
  POT_BLINDNESS: '失明', POT_PARALYSIS: '麻痹', POT_SPEED: '加速', POT_LEVITATION: '漂浮',
  POT_HALLUCINATION: '幻觉', POT_INVISIBILITY: '隐形', POT_SEE_INVISIBLE: '视隐形',
  POT_HEALING: '治疗', POT_EXTRA_HEALING: '强效治疗', POT_GAIN_LEVEL: '提升等级',
  POT_ENLIGHTENMENT: '启蒙', POT_MONSTER_DETECTION: '怪物探测', POT_OBJECT_DETECTION: '物品探测',
  POT_GAIN_ENERGY: '增强能量', POT_SLEEPING: '睡眠', POT_FULL_HEALING: '完全治疗',
  POT_POLYMORPH: '变形', POT_BOOZE: '烈酒', POT_SICKNESS: '疾病', POT_FRUIT_JUICE: '果汁',
  POT_ACID: '酸液', POT_OIL: '油', POT_WATER: '水',
  /* SPELLBOOK effects (excl. SPE_NOVEL — tribute titles) */
  SPE_DIG: '挖掘', SPE_MAGIC_MISSILE: '魔法飞弹', SPE_FIREBALL: '火球', SPE_CONE_OF_COLD: '寒冰锥',
  SPE_SLEEP: '睡眠', SPE_FINGER_OF_DEATH: '死亡之指', SPE_LIGHT: '光亮',
  SPE_DETECT_MONSTERS: '探测怪物', SPE_HEALING: '治疗', SPE_KNOCK: '敲击', SPE_FORCE_BOLT: '力量箭',
  SPE_CONFUSE_MONSTER: '迷惑怪物', SPE_CURE_BLINDNESS: '治疗失明', SPE_DRAIN_LIFE: '吸取生命',
  SPE_SLOW_MONSTER: '减速怪物', SPE_WIZARD_LOCK: '魔法封锁', SPE_CREATE_MONSTER: '创造怪物',
  SPE_DETECT_FOOD: '探测食物', SPE_CAUSE_FEAR: '制造恐惧', SPE_CLAIRVOYANCE: '千里眼',
  SPE_CURE_SICKNESS: '治疗疾病', SPE_CHARM_MONSTER: '魅惑怪物', SPE_HASTE_SELF: '自我加速',
  SPE_DETECT_UNSEEN: '探测隐形', SPE_LEVITATION: '漂浮', SPE_EXTRA_HEALING: '强效治疗',
  SPE_RESTORE_ABILITY: '恢复能力', SPE_INVISIBILITY: '隐形', SPE_DETECT_TREASURE: '探测宝藏',
  SPE_REMOVE_CURSE: '解除诅咒', SPE_MAGIC_MAPPING: '魔法地图', SPE_IDENTIFY: '鉴定',
  SPE_TURN_UNDEAD: '驱散亡灵', SPE_POLYMORPH: '变形', SPE_TELEPORT_AWAY: '传送离开',
  SPE_CREATE_FAMILIAR: '召唤仆从', SPE_CANCELLATION: '取消', SPE_PROTECTION: '保护',
  SPE_JUMPING: '跳跃', SPE_STONE_TO_FLESH: '石化解除', SPE_BLANK_PAPER: '空白纸',
  SPE_BOOK_OF_THE_DEAD: '亡灵之书',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys (incl _comment): ${Object.keys(json).length}`);
