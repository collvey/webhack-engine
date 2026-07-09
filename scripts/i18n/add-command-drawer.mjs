#!/usr/bin/env node
/*
 * WebHack i18n — add command-drawer name/tooltip translations to the frontend
 * locale bundles under `commandDrawer.names` and `commandDrawer.tooltips`,
 * keyed by the EXACT English string parsed from CommandDrawer.tsx (so keys can
 * never drift). The component reads both objects via t(..., {returnObjects}) and
 * indexes them by the English string in JS, which sidesteps the '.' present in
 * some tooltips (react-i18next key separators don't apply to object indexing).
 *
 * Validates: every parsed English string must have a zh translation, and every
 * zh key must exist in the source (catches typos). Idempotent.
 *
 * Usage: node scripts/i18n/add-command-drawer.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const srcRaw = fs.readFileSync(
  path.join(repoRoot, 'webhack-client', 'src', 'components', 'CommandDrawer.tsx'), 'utf8');
// Strip whole-line // comments so commented-out entries (which lack a tooltip)
// can't get lazily paired with the next entry's tooltip.
const src = srcRaw.replace(/^\s*\/\/.*$/gm, '');

// Parse { name: '...', key: ..., command: ..., tooltip: '...' } (commented-out
// entries have no tooltip, so they don't match). Handles escaped apostrophes.
const re = /\{\s*name:\s*'((?:[^'\\]|\\.)*)',\s*key:[^]*?tooltip:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
const unesc = (s) => s.replace(/\\'/g, "'").replace(/\\"/g, '"');
const names = [], tips = [];
let m;
while ((m = re.exec(src)) !== null) { names.push(unesc(m[1])); tips.push(unesc(m[2])); }

const nameZh = {
  'Pick up': '拾取', 'Drop': '丢弃', 'Drop multiple': '丢弃多个', 'Loot': '搜刮',
  'Search': '搜索', 'Eat': '进食', 'Rest': '休息', 'Go up': '上楼', 'Go down': '下楼',
  'Kick': '踢', 'What is here': '这里有什么', 'Inventory': '物品栏',
  'Apply (Use)': '使用（应用）', 'Quaff (Drink)': '饮用（喝）', 'Read': '阅读',
  'Wield': '持握', 'Wear': '穿戴', 'Take off': '脱下', 'Put on': '戴上', 'Remove': '摘下',
  'Zap (Wand)': '挥动（魔杖）', 'Cast spell': '施法', 'Chat': '交谈', 'Pay': '付款',
  'Toggle autopickup': '切换自动拾取', 'Throw': '投掷', 'Fire': '射击', 'Open': '打开',
  'Close': '关闭', 'Engrave': '刻字', 'Pray': '祈祷', 'Offer': '献祭', 'Sit': '坐下',
  'Dip': '浸入', 'Travel': '旅行', 'Look around': '环顾四周', 'Discoveries': '发现记录',
  'Name item': '命名物品', 'Attributes': '属性', 'Options': '选项',
  'Equipped items': '已装备物品', "What's nearby": '附近有什么', 'Adjust': '调整',
  'Swap weapons': '交换武器', 'Two weapon': '双武器格斗', 'Enhance skills': '提升技能',
  'Overview': '概览', 'Jump': '跳跃', 'Untrap': '解除陷阱', 'Ride': '骑乘', 'Rub': '摩擦',
  'Invoke': '唤起', 'Force': '强行打开', 'Conduct': '行为准则', 'Teleport': '传送',
  'Wipe face': '擦脸', 'Monster ability': '怪物能力', 'Turn undead': '驱散亡灵',
};

const tipZh = {
  'Pick up items from the ground at your current location': '拾取当前位置地面上的物品',
  'Drop a single item from your inventory onto the ground': '将物品栏中的单个物品丢到地上',
  'Drop multiple items at once from your inventory': '一次性丢弃物品栏中的多个物品',
  'Loot containers like chests, sacks, or corpses': '搜刮箱子、袋子或尸体等容器',
  'Search for hidden doors, traps, or secret passages nearby': '搜索附近隐藏的门、陷阱或秘密通道',
  'Eat food to satisfy hunger and avoid starvation': '进食以充饥，避免饿死',
  'Wait one turn to regain health and energy': '等待一回合以恢复生命值和能量',
  'Climb up stairs or ladders to the previous dungeon level': '爬上楼梯或梯子到上一层地牢',
  'Climb down stairs or ladders to the next dungeon level': '爬下楼梯或梯子到下一层地牢',
  'Kick doors, objects, or monsters. Can break down locked doors': '踢门、物品或怪物。可以踢开上锁的门',
  'List all items and features at your current location': '列出当前位置的所有物品和地形',
  'View your complete inventory of carried items': '查看你携带物品的完整清单',
  'Use a tool, key, or other applicable item': '使用工具、钥匙或其他可应用的物品',
  'Drink a potion to gain its magical effects': '饮用药水以获得其魔法效果',
  'Read a scroll, spellbook, or piece of paper': '阅读卷轴、法术书或纸张',
  'Ready a weapon in your hands for combat': '在手中备好武器以进行战斗',
  'Put on armor, shields, or other protective gear': '穿上盔甲、盾牌或其他防护装备',
  'Remove armor or other worn items': '脱下盔甲或其他穿戴的物品',
  'Put on rings or amulets for their magical effects': '戴上戒指或护身符以获得其魔法效果',
  'Remove rings or amulets you are wearing': '摘下你正佩戴的戒指或护身符',
  'Use a magic wand to cast its spell effect': '使用魔杖释放其法术效果',
  'Cast a spell from your known spell list': '从你已知的法术列表中施放法术',
  'Talk to nearby monsters, shopkeepers, or NPCs': '与附近的怪物、店主或NPC交谈',
  'Pay a shopkeeper for items you want to purchase': '向店主付款购买你想要的物品',
  'Turn automatic item pickup on or off': '开启或关闭自动拾取物品',
  'Throw an item at a target. Good for daggers, potions, or gems': '向目标投掷物品。适合匕首、药水或宝石',
  'Fire ammunition from your readied weapon (bow, sling, etc.)': '用备好的武器（弓、投石索等）发射弹药',
  'Open a door or container': '打开门或容器',
  'Close a door to block monsters or create barriers': '关门以阻挡怪物或制造屏障',
  'Write text on the floor. "Elbereth" can scare some monsters': '在地上写字。“Elbereth”可以吓退某些怪物',
  'Pray to your god for divine intervention. Use sparingly!': '向你的神祈祷以求神迹。请谨慎使用！',
  'Offer a sacrifice on an altar to your god': '在祭坛上向你的神献祭',
  'Sit down to rest. Useful near fountains or thrones': '坐下休息。在喷泉或王座附近很有用',
  'Dip an item into a potion, fountain, or other liquid': '将物品浸入药水、喷泉或其他液体',
  'Auto-travel to a distant location. Pick a direction or destination': '自动前往远处的位置。选择方向或目的地',
  'Examine map tiles and objects. Use arrow keys to explore visually': '查看地图格子和物品。用方向键进行视觉探索',
  "View all items you've identified and their properties": '查看你已鉴定的所有物品及其属性',
  'Give custom names to items, item types, or the current level': '为物品、物品类型或当前楼层起自定义名称',
  'View your character sheet with detailed stats and abilities': '查看你的角色卡，含详细属性和能力',
  'Open the options menu to configure game settings': '打开选项菜单以配置游戏设置',
  'See everything currently equipped on your body': '查看你身上当前装备的所有物品',
  'List visible monsters, items, and features around you': '列出你周围可见的怪物、物品和地形',
  'Reorganize inventory letters or swap item positions': '重新整理物品栏字母或交换物品位置',
  'Quickly swap between your primary and alternate weapon': '在主武器和副武器之间快速切换',
  'Toggle two-weapon fighting mode for dual wielding': '切换双武器格斗模式以双持',
  'Improve your weapon and spell skills when you have points': '在有技能点时提升你的武器和法术技能',
  'View dungeon overview showing explored levels and branches': '查看地牢概览，显示已探索的楼层和分支',
  'Jump over pits, traps, or gaps. Requires enough room to land': '跳过坑、陷阱或缺口。需要足够的落地空间',
  'Attempt to disarm a trap or open a trapped container safely': '尝试拆除陷阱或安全打开带陷阱的容器',
  'Mount or dismount a tamed steed for faster travel': '骑上或下驯服的坐骑以更快移动',
  'Rub a lamp to summon a djinni, or polish gems to appraise value': '摩擦油灯以召唤精灵，或打磨宝石以鉴定价值',
  'Activate special powers of artifacts or magical objects': '激活神器或魔法物品的特殊力量',
  'Force open a locked door or container with a tool': '用工具强行打开上锁的门或容器',
  "Check which game conduct challenges you've maintained (vegan, pacifist, etc.)": '查看你保持了哪些游戏行为挑战（纯素、和平主义等）',
  'Magically teleport to a random location (requires teleport intrinsic)': '魔法传送到随机位置（需要传送内禀能力）',
  'Clean your face after being hit with cream pies or blinding attacks': '在被奶油派或致盲攻击击中后清洁面部',
  'Use special abilities from polymorphed form (breathe fire, etc.)': '使用变形形态的特殊能力（喷火等）',
  'Priests can turn undead monsters, making them flee in terror': '牧师可以驱散亡灵怪物，使其恐惧逃窜',
};

// Validate coverage both ways.
const missName = names.filter(n => !(n in nameZh));
const missTip = tips.filter(t => !(t in tipZh));
const extraName = Object.keys(nameZh).filter(n => !names.includes(n));
const extraTip = Object.keys(tipZh).filter(t => !tips.includes(t));
if (missName.length || missTip.length || extraName.length || extraTip.length) {
  console.error('Parsed', names.length, 'commands.');
  if (missName.length) console.error('MISSING name zh:', missName);
  if (missTip.length) console.error('MISSING tooltip zh:', missTip);
  if (extraName.length) console.error('STALE name key (not in source):', extraName);
  if (extraTip.length) console.error('STALE tooltip key (not in source):', extraTip);
  process.exit(1);
}

const bundles = {
  en: { names: Object.fromEntries(names.map(n => [n, n])),
        tooltips: Object.fromEntries(tips.map(t => [t, t])) },
  'zh-CN': { names: nameZh, tooltips: tipZh },
};

let total = 0;
for (const lang of ['en', 'zh-CN']) {
  const file = path.join(repoRoot, 'locales', lang, 'frontend.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.commandDrawer = json.commandDrawer || {};
  let added = 0;
  for (const group of ['names', 'tooltips']) {
    json.commandDrawer[group] = json.commandDrawer[group] || {};
    for (const [k, v] of Object.entries(bundles[lang][group])) {
      if (!(k in json.commandDrawer[group])) { json.commandDrawer[group][k] = v; added++; }
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`${lang}: added ${added}`);
  total += added;
}
console.log(`Parsed ${names.length} commands; total ${total} keys added.`);
