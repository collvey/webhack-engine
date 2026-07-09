#!/usr/bin/env node
/*
 * WebHack i18n — add unidentified object APPEARANCE descriptors (potion colors/
 * textures, etc.) to the C message catalog (locales/zh-CN/webhack.translations
 * .json). Looked up via _(dn) in the unidentified branches of xname()
 * (src/objnam.c), composed as "<appearance><class-noun>". Idempotent.
 *
 * Usage: node scripts/i18n/add-appearances.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const additions = {
  /* potion appearances (objects.c) */
  'ruby': '红宝石色',
  'pink': '粉红色',
  'orange': '橙色',
  'yellow': '黄色',
  'emerald': '翠绿色',
  'dark green': '深绿色',
  'cyan': '青色',
  'sky blue': '天蓝色',
  'brilliant blue': '亮蓝色',
  'magenta': '洋红色',
  'purple-red': '紫红色',
  'puce': '深褐色',
  'milky': '乳白色',
  'swirly': '漩涡状',
  'bubbly': '冒泡的',
  'smoky': '烟雾状',
  'cloudy': '浑浊的',
  'effervescent': '起泡的',
  'black': '黑色',
  'golden': '金色',
  'brown': '棕色',
  'fizzy': '嘶嘶作响的',
  'dark': '暗色',
  'white': '白色',
  'murky': '昏暗的',
  'clear': '透明',
  /* ring appearances (materials) */
  'wooden': '木质', 'granite': '花岗岩', 'opal': '蛋白石', 'clay': '陶土',
  'coral': '珊瑚', 'black onyx': '黑玛瑙', 'moonstone': '月长石', 'tiger eye': '虎眼石',
  'jade': '翡翠', 'bronze': '青铜', 'agate': '玛瑙', 'topaz': '黄玉', 'sapphire': '蓝宝石',
  'diamond': '钻石', 'pearl': '珍珠', 'iron': '铁', 'brass': '黄铜', 'copper': '紫铜',
  'twisted': '扭曲', 'steel': '钢', 'silver': '银', 'gold': '金', 'ivory': '象牙',
  'wire': '铁丝', 'engagement': '订婚', 'shiny': '闪亮',
  /* wand appearances (materials) */
  'glass': '玻璃', 'balsa': '轻木', 'crystal': '水晶', 'maple': '枫木', 'pine': '松木',
  'oak': '橡木', 'ebony': '乌木', 'marble': '大理石', 'tin': '锡', 'platinum': '铂',
  'iridium': '铱', 'zinc': '锌', 'aluminum': '铝', 'uranium': '铀', 'hexagonal': '六角形',
  'short': '短', 'runed': '符文', 'long': '长', 'curved': '弯曲', 'forked': '分叉',
  'spiked': '尖刺', 'jeweled': '镶宝石',
  /* amulet appearances (shapes) */
  'circular': '圆形', 'spherical': '球形', 'oval': '椭圆形', 'triangular': '三角形',
  'pyramidal': '锥形', 'square': '方形', 'concave': '凹形', 'octagonal': '八角形',
  /* tool appearances */
  'key': '钥匙', 'candle': '蜡烛', 'lamp': '灯', 'looking glass': '镜子',
  'glass orb': '玻璃球', 'whistle': '哨子', 'flute': '长笛', 'horn': '号角',
  'harp': '竖琴', 'drum': '鼓', 'iron hook': '铁钩', 'silver bell': '银铃',
  /* spellbook appearances (paper / binding / color) */
  'parchment': '羊皮纸', 'vellum': '牛皮纸', 'ragged': '破旧', 'dog eared': '卷角',
  'mottled': '斑驳', 'stained': '污渍', 'cloth': '布面', 'leathery': '皮革',
  'red': '红色', 'velvet': '天鹅绒', 'light green': '浅绿色', 'turquoise': '绿松色',
  'light blue': '浅蓝色', 'dark blue': '深蓝色', 'indigo': '靛蓝色', 'purple': '紫色',
  'violet': '紫罗兰色', 'tan': '棕褐色', 'plaid': '格纹', 'light brown': '浅棕色',
  'dark brown': '深棕色', 'gray': '灰色', 'wrinkled': '褶皱', 'dusty': '满是灰尘',
  'glittering': '闪耀', 'shining': '发光', 'dull': '暗淡', 'thin': '薄', 'thick': '厚',
  'canvas': '帆布', 'hardcover': '精装', 'plain': '朴素',
  /* gem (worthless-glass) colors not already covered */
  'blue': '蓝色', 'green': '绿色', 'yellowish brown': '黄褐色',
  /* armor appearances (helm/cloak/gloves/boots) */
  'leather hat': '皮帽', 'iron skull cap': '铁头盖', 'hard hat': '安全帽',
  'conical hat': '尖顶帽', 'plumed helmet': '羽饰头盔', 'etched helmet': '蚀刻头盔',
  'crested helmet': '带冠头盔', 'visored helmet': '带面甲头盔', 'faded pall': '褪色披风',
  'coarse mantelet': '粗糙短斗篷', 'hooded cloak': '兜帽斗篷', 'slippery cloak': '光滑斗篷',
  'apron': '围裙', 'tattered cape': '破烂斗篷', 'opera cloak': '歌剧斗篷',
  'ornamental cope': '装饰法衣', 'piece of cloth': '布片', 'old gloves': '旧手套',
  'padded gloves': '衬垫手套', 'riding gloves': '骑行手套', 'fencing gloves': '击剑手套',
  'walking shoes': '步行鞋', 'hard shoes': '硬底鞋', 'jackboots': '长筒靴',
  'combat boots': '战斗靴', 'jungle boots': '丛林靴', 'hiking boots': '徒步靴',
  'mud boots': '防泥靴', 'buckled boots': '带扣靴', 'riding boots': '骑行靴',
  'snow boots': '雪地靴', 'crude chain mail': '粗制锁子甲', 'crude ring mail': '粗制环甲',
  /* armor generic class words + "called" (unidentified/user-named armor) */
  'shield': '盾', 'smooth shield': '光滑的盾', 'boots': '靴子', 'gloves': '手套',
  'cloak': '斗篷', 'helmet': '头盔', 'armor': '护甲', ' called ': '称为',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [en, zh] of Object.entries(additions)) {
  if (Object.prototype.hasOwnProperty.call(json, en)) { dup++; continue; }
  json[en] = zh; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added} appearances, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
