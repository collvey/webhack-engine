#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
// OVERRIDE frame words that are ambiguous: "have "/"had " serve both possession
// (you_have) AND perfect-tense (you_have_X) — dropping to "" reads well for both.
const upsert = {
  "have ": "", "had ": "曾",
};
const add = {
  // basics
  "Basics:": "基础：",
  "all %d hit points": "全部 %d 点生命值", "%d out of %d hit point%s": "%d/%d 点生命值%s",
  "both": "两者", "all %d %s": "全部 %d 点%s", "%d out of %d %s": "%d/%d 点%s",
  "energy points (spell power)": "能量点（法力）",
  "0 hit dice (actually 1/2)": "0 生命骰（实际为 1/2）", "1 hit die": "1 生命骰",
  "%d hit dice": "%d 生命骰",
  "Your armor class ": "你的护甲等级 ", "is ": "是 ", "was ": "曾是 ",
  "Your wallet ": "你的钱包 ", "empty": "空空如也",
  "contains ": "含有 ", "contained ": "曾含有 ",
  "on": "开启", " for %s%s%s": "，针对 %s%s%s", "all types": "所有类别",
  " plus thrown": "，外加投掷物", ", with exceptions": "，有例外",
  "off": "关闭", "Autopickup ": "自动拾取 ",
  // characteristics
  "%s Characteristics:": "%s属性：", "Current": "当前", "Final": "最终",
  "Your %s ": "你的%s ", "%sbase:%s": "%s基础：%s", "%speak:%s": "%s峰值：%s",
  "%s%slimit:%s": "%s%s上限：%s", "innate ": "天生",
  // conduct
  "Voluntary challenges:": "自愿挑战：",
  "blind from birth": "生来失明", "faithfully nudist": "忠实地保持裸体",
  "have gone": "始终", "went": "曾", " without food": "不进食",
  "followed a strict vegan diet": "遵循严格的纯素饮食", "vegetarian": "是素食者",
  "an atheist": "是无神论者",
  "hit with a wielded weapon": "用手持武器攻击过",
  "used a wielded weapon %ld time%s": "使用手持武器 %ld 次%s",
  "a pacifist": "是和平主义者", "illiterate": "是文盲",
  "read items or engraved %ld time%s": "阅读物品或刻写 %ld 次%s",
  "genocided any monsters": "灭绝过任何怪物",
  "genocided %d type%s of monster%s": "灭绝了 %d 类怪物%s%s",
  "polymorphed an object": "变形过任何物品",
  "polymorphed %ld item%s": "变形了 %ld 件物品%s",
  "changed form": "改变过形态", "changed form %ld time%s": "改变形态 %ld 次%s",
  "used no wishes": "未使用任何愿望", "used %ld wish%s": "使用了 %ld 个愿望%s",
  "for %s)": "用于%s）", "an artifact": "一件神器", "artifacts": "神器",
  "have not wished": "没有许愿", "did not wish": "未曾许愿",
  " for any artifacts": "求取任何神器",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0, u = 0;
for (const [k, v] of Object.entries(upsert)) { if (json[k] !== v) u++; json[k] = v; }
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, upserted ${u}, skipped ${d}, total ${Object.keys(json).length}`);
