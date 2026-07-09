#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // zap.c
  "one of ": "其中一个 ",
  "zapped %sself with a wand": "用魔杖击中了自己",
  "shot %sself with a death ray": "被死亡射线射中了自己",
  "%s %sself with %s": "%s%s了自己，用%s",
  "zapped": "用魔杖击中", "blasted": "轰击", "miss": "未命中", " more": "更多",
  "For what do you wish": "你想许什么愿",
  " (enter 'help' for assistance)": "（输入 'help' 获取帮助）",
  // weapon.c #enhance
  "ring%s": "戒指%s", "%s welded to %s %s": "%s焊在了%s%s上",
  "(Skill%s flagged by \"*\" may be enhanced %s.)": "（标有 \"*\" 的技能%s可在%s时提升。）",
  "when you're more experienced": "你更有经验",
  "if skill slots become available": "有技能槽可用",
  "(Skill%s flagged by \"#\" cannot be enhanced any further.)": "（标有 \"#\" 的技能%s无法再进一步提升。）",
  "Pick a skill to advance:": "选择要提升的技能：", "Current skills:": "当前技能：",
  "  (%d slot%s available)": "  （有 %d 个技能槽可用%s）",
  // uhitm.c combat / digest
  " with %s": "，用%s", "Your %s%s %s": "你的%s%s%s", "silver ": "银", "sear": "灼烧",
  " flesh": "血肉", "%s radiance penetrates deep into": "%s的光芒深深穿透",
  "swallowing %s whole": "整个吞下%s", "unwisely tried to eat %s": "不明智地试图吃掉%s",
  "You totally digest %s.": "你彻底消化了%s。",
  "%s isn't sitting well with you.": "%s让你很不舒服。",
  // pray.c
  "Your %s %s better": "你的%s%s好些了", "%s can hear again": "%s又能听见了",
  "You": "你", " and you": "以及你", "the wrath of %s": "%s的愤怒",
  "%s sword": "%s剑", " and %s now as good as new": "，而%s现在焕然一新",
  "something dreadful": "某种可怕的东西", "%s indifference": "%s的冷漠",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
