#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // ends[] death verbs (used as "You %s in %s" / "when you %s")
  "died": "死亡", "choked": "窒息而死", "were poisoned": "中毒身亡",
  "starved": "饿死", "drowned": "溺水身亡", "burned": "被烧死",
  "dissolved in the lava": "溶解于熔岩之中",
  "were crushed": "被压碎", "turned to stone": "化为石头",
  "turned into slime": "化为软泥", "were genocided": "被灭绝",
  "panicked": "惊慌而亡", "were tricked": "中计身亡", "quit": "退出",
  "escaped": "逃脱", "ascended": "飞升",
  // ascension / death summary
  " (with the Amulet)": "（带着护身符）",
  " (in celestial disgrace)": "（在天界蒙羞）",
  " (with a fake Amulet)": "（带着假护身符）",
  "%s %s the %s...": "%s，%s，%s……",
  "Demigoddess": "半神女", "Demigod": "半神",
  "You": "你",
  " and %s": "和%s",
  " and Schroedinger's cat": "和薛定谔的猫",
  "%s with %ld point%s,": "%s，共 %ld 点%s，",
  "went to your reward": "去往了你的奖赏",
  "escaped from the dungeon": "逃出了地牢",
  "%8ld %s (worth %ld %s),": "%8ld %s（价值 %ld %s），",
  "%8ld worthless piece%s of colored glass,": "%8ld 块无价值的彩色玻璃%s，",
  "You %s beyond the confines of the dungeon": "你%s，越过了地牢的界限",
  "passed away": "离世",
  "You %s in %s": "你%s于%s",
  "The Astral Plane": "星界",
  " on dungeon level %d": "，位于地牢第 %d 层",
  " with %ld point%s,": "，共 %ld 点%s，",
  "and %ld piece%s of gold, after %ld move%s.": "以及 %ld 枚金币%s，历经 %ld 步%s。",
  "You were level %d with a maximum of %d hit point%s when you %s.": "你曾是第 %d 级，最大生命值为 %d%s，当时你%s。",
  // vanquished / genocided disclosure
  "Vanquished creatures:": "已击败的生物：",
  " (twice)": "（两次）", " (thrice)": "（三次）", " (%d times)": "（%d 次）",
  "%s%s species:": "%s%s物种：",
  "Genocided": "已灭绝", "Extinct": "已绝种", " or extinct": "或已绝种",
  " (extinct)": "（已绝种）",
  "%d species genocided.": "灭绝了 %d 个物种。",
  "%d species extinct.": "%d 个物种已绝种。",
  // killer-entity naming ("Killed by X")
  "hallucinogen-distorted ": "被致幻剂扭曲的",
  "%s in %s form": "%s（%s形态）",
  "%s disguised as %s": "%s伪装成%s",
  "%s imitating %s": "%s模仿%s",
  "ghost": "鬼魂",
  " of %s": "，属于%s",
  "Ms. ": "", "Mr. ": "",
  "%s%s, the shopkeeper": "%s%s，店主",
  " called %s": "，名为%s",
  // misc displayed
  "%s%s (worth %ld %s and %ld points)": "%s%s（价值 %ld %s 及 %ld 点）",
  "quit while already on Charon's boat": "在卡戎的船上时便已退出",
  "Contents of %s:": "%s 的内容物：",
  "Schroedinger's cat!": "薛定谔的猫！",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
