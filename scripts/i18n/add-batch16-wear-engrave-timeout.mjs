#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // engrave.c wand-in-engrave effects
  "The wand unsuccessfully fights your attempt to write!": "魔杖徒劳地抵抗着你书写的尝试！",
  "The bugs on the %s slow down!": "%s上的虫子慢了下来！",
  "The bugs on the %s speed up!": "%s上的虫子加快了！",
  "The %s is riddled by bullet holes!": "%s被打得千疮百孔！",
  "The bugs on the %s stop moving!": "%s上的虫子停止了移动！",
  "A few ice cubes drop from the wand.": "几块冰块从魔杖上掉落。",
  "You hear drilling!": "你听到钻孔声！",
  "You feel tremors.": "你感到一阵震动。",
  "Chips fly out from the headstone.": "碎片从墓碑上飞出。",
  "Ice chips fly up from the ice surface!": "冰屑从冰面上飞起！",
  "Splinters fly up from the bridge.": "碎片从桥上飞起。",
  "Gravel flies up from the floor.": "砾石从地板上飞起。",
  "You feel the wand heat up.": "你感到魔杖发热。",
  "Flames fly from the wand.": "火焰从魔杖中喷出。",
  "Lightning arcs from the wand.": "闪电从魔杖中迸射而出。",
  "You hear crackling!": "你听到噼啪声！",
  "Your hair stands up!": "你的头发竖了起来！",
  // do_wear.c wear/remove
  " around your %s": "，缠在你的%s上",
  "%s gloves while wielding %s": "%s手套，同时正挥舞着%s",
  "removing": "脱下", "losing": "丢失",
  "You stop %s %s.": "你停止%s%s。", "putting on": "穿上", "taking off": "脱下",
  " without taking off your %s first": "，而不先脱下你的%s",
  "; it's embedded": "；它已嵌入体内",
  "You finish taking off your %s.": "你脱下了你的%s。",
  "free a weapon %s": "腾出一只持武器的%s",
  "take off your %s%s": "脱下你的%s%s", "slippery ": "滑溜的",
  "remove your %s": "脱下你的%s",
  "release your %s": "松开你的%s",
  // timeout.c death reasons / figurine
  "turned into green slime": "变成了绿色软泥",
  "slimicide": "灭泥剂",
  "green slime has been genocided...": "绿色软泥已被种族灭绝……",
  "killed by petrification": "被石化所杀",
  "suffocation": "窒息", "strangulation": "勒毙",
  "%s pack": "%s的背包",
  "empty water": "空荡的水中", "thin air": "稀薄的空气",
  "tripping over %s corpse": "被%s的尸体绊倒",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
