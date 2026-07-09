#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // destroy_strings[][3]
  'freezes and shatters': '冻结并碎裂', 'freeze and shatter': '冻结并碎裂', 'shattered potion': '碎裂的药水',
  'boils and explodes': '沸腾并爆炸', 'boil and explode': '沸腾并爆炸', 'boiling potion': '沸腾的药水',
  'ignites and explodes': '燃起并爆炸', 'ignite and explode': '燃起并爆炸', 'exploding potion': '爆炸的药水',
  'catches fire and burns': '着火燃烧', 'catch fire and burn': '着火燃烧', 'burning scroll': '燃烧的卷轴',
  'burning book': '燃烧的魔法书', 'turns to dust and vanishes': '化为尘埃消失',
  'breaks apart and explodes': '碎裂并爆炸', 'exploding wand': '爆炸的魔杖',
  'exploding glob of slime': '爆裂的软泥团',
  // possessive prefixes "%s %s %s!"
  'Your': '你的', 'One of your': '你的一个', 'Some of your': '你的一些',
  'Both of your': '你的两个', 'All of your': '你的所有',
  // single messages
  'are blinded by the flash!': '被闪光弄瞎了！',
  'spell of light': '光明法术',
  'Some writing vanishes from %s head!': '一些文字从%s头上消失了！',
  'your': '你的',
  'The ice crackles and melts.': '冰噼啪作响并融化了。',
  'Some ice melts away.': '一些冰融化了。',
  'You hear hissing gas.': '你听到嘶嘶的气体声。',
  'That seemed remarkably uneventful.': '那似乎异常平静。',
  'Some water evaporates.': '一些水蒸发了。',
  'The water evaporates.': '水蒸发了。',
  'bolt': '射线', 'spell': '法术',
  'The door is consumed in flames!': '门被烈焰吞噬了！', 'smell smoke.': '闻到烟味。',
  'The door freezes and shatters!': '门冻结并碎裂了！', 'feel cold.': '感到寒冷。',
  'The door disintegrates!': '门崩解了！', 'crashing wood.': '木头碎裂声。',
  'The door splinters!': '门裂成了碎片！', 'crackling.': '噼啪声。',
  'The door crashes open!': '门被撞开了！', 'feel a burst of cool air.': '感到一阵凉风。',
  // zap verbs / damage verbs
  'pulsate': '搏动', 'zap': '挥动', 'boomerang': '回旋镖',
  'burn away': '烧毁', 'shatter': '击碎', 'disintegrate': '崩解',
  // wish cmdassist help (prose translated; typed examples kept English for readobjnam)
  'Wish details:': '许愿详情：',
  'Enter the name of an object, such as "potion of monster detection",':
    '输入物品名称，例如“potion of monster detection”，',
  '"scroll labeled README", "elven mithril-coat", or "Grimtooth"':
    '“scroll labeled README”、“elven mithril-coat”或“Grimtooth”',
  '(without the quotes).': '（不含引号）。',
  'For object types which come in stacks, you may specify a plural name':
    '对于成叠出现的物品类型，你可以指定复数名称',
  'such as "potions of healing", or specify a count, such as "1000 gold':
    '例如“potions of healing”，或指定数量，例如“1000 gold',
  'pieces", although that aspect of your wish might not be granted.':
    'pieces”，不过愿望的这一方面可能不会实现。',
  'You may also specify various prefix values which might be used to':
    '你还可以指定各种前缀值，用于',
  'modify the item, such as "uncursed" or "rustproof" or "+1".':
    '修饰物品，例如“uncursed”“rustproof”或“+1”。',
  'Most modifiers shown when viewing your inventory can be specified.':
    '查看物品栏时显示的大多数修饰词都可以指定。',
  "You may specify 'nothing' to explicitly decline this wish.":
    '你可以指定“nothing”来明确放弃这次愿望。',
  "Doing so will preserve 'wishless' conduct.":
    '这样做将保持“无愿望”行为准则。',
  'If you specify an unrecognized object name %s%s time%s,':
    '如果你%s%s次指定无法识别的物品名称，',
  'a randomly chosen item will be granted.': '将随机赐予一件物品。',
  '(Suppress this assistance with !cmdassist in your config file.)':
    '（在配置文件中用 !cmdassist 关闭此帮助。）',
  // cardinals[] + too_many
  'zero': '零', 'one': '一', 'two': '二', 'three': '三', 'four': '四', 'five': '五',
  'too many': '太多',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
