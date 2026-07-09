#!/usr/bin/env node
/*
 * WebHack i18n — add armor / food / gem / rock base names to
 * webhack-client/public/data/object-names.zh-CN.json (keyed by ONAME).
 * Excludes specially-composed objects (Corpse/Egg/Tin/Statue) whose display
 * names are assembled elsewhere ("<mon> corpse", "statue of <mon>", "tin of X").
 * Idempotent; gen-c-objnames.mjs validates the ONAME keys against onames.h.
 *
 * Usage: node scripts/i18n/add-objnames-batch2.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'webhack-client', 'public', 'data', 'object-names.zh-CN.json');

const add = {
  /* ARMOR */
  ELVEN_LEATHER_HELM: '精灵皮盔', ORCISH_HELM: '兽人头盔', DWARVISH_IRON_HELM: '矮人铁盔',
  FEDORA: '软呢帽', CORNUTHAUM: '尖顶魔法帽', DUNCE_CAP: '笨蛋帽', DENTED_POT: '凹陷的锅',
  HELMET: '头盔', HELM_OF_BRILLIANCE: '才智头盔', HELM_OF_OPPOSITE_ALIGNMENT: '反阵营头盔',
  HELM_OF_TELEPATHY: '心灵感应头盔',
  GRAY_DRAGON_SCALE_MAIL: '灰龙鳞甲', SILVER_DRAGON_SCALE_MAIL: '银龙鳞甲',
  RED_DRAGON_SCALE_MAIL: '红龙鳞甲', WHITE_DRAGON_SCALE_MAIL: '白龙鳞甲',
  ORANGE_DRAGON_SCALE_MAIL: '橙龙鳞甲', BLACK_DRAGON_SCALE_MAIL: '黑龙鳞甲',
  BLUE_DRAGON_SCALE_MAIL: '蓝龙鳞甲', GREEN_DRAGON_SCALE_MAIL: '绿龙鳞甲',
  YELLOW_DRAGON_SCALE_MAIL: '黄龙鳞甲',
  GRAY_DRAGON_SCALES: '灰龙鳞', SILVER_DRAGON_SCALES: '银龙鳞', RED_DRAGON_SCALES: '红龙鳞',
  WHITE_DRAGON_SCALES: '白龙鳞', ORANGE_DRAGON_SCALES: '橙龙鳞', BLACK_DRAGON_SCALES: '黑龙鳞',
  BLUE_DRAGON_SCALES: '蓝龙鳞', GREEN_DRAGON_SCALES: '绿龙鳞', YELLOW_DRAGON_SCALES: '黄龙鳞',
  PLATE_MAIL: '板甲', CRYSTAL_PLATE_MAIL: '水晶板甲', BRONZE_PLATE_MAIL: '青铜板甲',
  SPLINT_MAIL: '环片甲', BANDED_MAIL: '条带甲', DWARVISH_MITHRIL_COAT: '矮人秘银衣',
  ELVEN_MITHRIL_COAT: '精灵秘银衣', CHAIN_MAIL: '锁子甲', ORCISH_CHAIN_MAIL: '兽人锁子甲',
  SCALE_MAIL: '鳞甲', STUDDED_LEATHER_ARMOR: '镶钉皮甲', RING_MAIL: '环甲',
  ORCISH_RING_MAIL: '兽人环甲', LEATHER_ARMOR: '皮甲', LEATHER_JACKET: '皮夹克',
  HAWAIIAN_SHIRT: '夏威夷衬衫', T_SHIRT: 'T恤', MUMMY_WRAPPING: '木乃伊裹布',
  ELVEN_CLOAK: '精灵斗篷', ORCISH_CLOAK: '兽人斗篷', DWARVISH_CLOAK: '矮人斗篷',
  OILSKIN_CLOAK: '油布斗篷', ROBE: '长袍', ALCHEMY_SMOCK: '炼金罩衫', LEATHER_CLOAK: '皮斗篷',
  CLOAK_OF_PROTECTION: '防护斗篷', CLOAK_OF_INVISIBILITY: '隐形斗篷',
  CLOAK_OF_MAGIC_RESISTANCE: '抗魔斗篷', CLOAK_OF_DISPLACEMENT: '位移斗篷',
  SMALL_SHIELD: '小盾', ELVEN_SHIELD: '精灵盾', URUK_HAI_SHIELD: '乌鲁克盾',
  ORCISH_SHIELD: '兽人盾', LARGE_SHIELD: '大盾', DWARVISH_ROUNDSHIELD: '矮人圆盾',
  SHIELD_OF_REFLECTION: '反射盾', LEATHER_GLOVES: '皮手套', GAUNTLETS_OF_FUMBLING: '笨拙护手',
  GAUNTLETS_OF_POWER: '力量护手', GAUNTLETS_OF_DEXTERITY: '敏捷护手', LOW_BOOTS: '低帮靴',
  IRON_SHOES: '铁鞋', HIGH_BOOTS: '高帮靴', SPEED_BOOTS: '迅捷靴',
  WATER_WALKING_BOOTS: '水上行走靴', JUMPING_BOOTS: '跳跃靴', ELVEN_BOOTS: '精灵靴',
  KICKING_BOOTS: '踢击靴', FUMBLE_BOOTS: '笨拙靴', LEVITATION_BOOTS: '漂浮靴',
  /* FOOD (excl. Corpse/Egg/Tin — special composition) */
  TRIPE_RATION: '内脏口粮', MEATBALL: '肉丸', MEAT_STICK: '肉棒', HUGE_CHUNK_OF_MEAT: '巨块肉',
  MEAT_RING: '肉环', GLOB_OF_GRAY_OOZE: '灰软泥团', GLOB_OF_BROWN_PUDDING: '棕布丁团',
  GLOB_OF_GREEN_SLIME: '绿黏液团', GLOB_OF_BLACK_PUDDING: '黑布丁团', KELP_FROND: '海带叶',
  EUCALYPTUS_LEAF: '桉树叶', APPLE: '苹果', ORANGE: '橙子', PEAR: '梨', MELON: '甜瓜',
  BANANA: '香蕉', CARROT: '胡萝卜', SPRIG_OF_WOLFSBANE: '附子草枝', CLOVE_OF_GARLIC: '蒜瓣',
  SLIME_MOLD: '黏菌', LUMP_OF_ROYAL_JELLY: '蜂王浆块', CREAM_PIE: '奶油派', CANDY_BAR: '糖果棒',
  FORTUNE_COOKIE: '幸运饼干', PANCAKE: '煎饼', LEMBAS_WAFER: '兰巴斯薄饼', CRAM_RATION: '压缩口粮',
  FOOD_RATION: '食物口粮', K_RATION: 'K口粮', C_RATION: 'C口粮',
  /* GEM */
  DILITHIUM_CRYSTAL: '双锂晶体', DIAMOND: '钻石', RUBY: '红宝石', JACINTH: '红锆石',
  SAPPHIRE: '蓝宝石', BLACK_OPAL: '黑蛋白石', EMERALD: '祖母绿', TURQUOISE: '绿松石',
  CITRINE: '黄水晶', AQUAMARINE: '海蓝宝石', AMBER: '琥珀', TOPAZ: '黄玉', JET: '煤玉',
  OPAL: '蛋白石', CHRYSOBERYL: '金绿宝石', GARNET: '石榴石', AMETHYST: '紫水晶', JASPER: '碧玉',
  FLUORITE: '萤石', OBSIDIAN: '黑曜石', AGATE: '玛瑙', JADE: '翡翠', LUCKSTONE: '幸运石',
  LOADSTONE: '磁石', TOUCHSTONE: '试金石', FLINT: '燧石', ROCK: '石头',
  /* ROCK (excl. Statue — "statue of <mon>") */
  BOULDER: '巨石',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys (incl _comment): ${Object.keys(json).length}`);
