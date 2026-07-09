#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  "wielding two weapons at once": "同时挥舞两把武器",
  "wielding some %s": "挥舞着某种%s", "wielding %s": "挥舞着%s",
  "%s %s %s": "%s%s%s", "skill with": "运用……的技能", "in": "擅长",
  " and %s that": "，并且%s它", "can enhance": "能提升", "could have enhanced": "本可提升",
  " not wear any armor": "不穿任何护甲", "not wearing any armor": "未穿任何护甲",
  "Final Attributes:": "最终属性：", "Current Attributes:": "当前属性：",
  "the Hand of Elbereth": "埃尔贝瑞斯之手", "the Envoy of Balance": "平衡的使者",
  "the Glory of Arioch": "阿里奥克的荣光", "aligned": "与信仰契合",
  "invulnerable": "无敌", "magic-protected": "受魔法保护",
  "fire resistant": "抗火", "cold resistant": "抗寒", "sleep resistant": "抗睡眠",
  "disintegration-resistant": "抗解离", "shock resistant": "抗电击",
  "poison resistant": "抗毒", "acid resistant": "抗酸",
  "level-drain resistant": "抗吸取等级", "immune to sickness": "免疫疾病",
  "petrification resistant": "抗石化",
  " hallucinations": "幻觉", "recognize detrimental food": "识别有害食物",
  " invisible": "隐形", " invisible when not blind": "在非失明时看见隐形",
  "telepathic": "拥有心灵感应", "warned": "受到警示",
  "aware of the presence of %s": "察觉到%s的存在",
  "orcs": "兽人", "elves": "精灵", "demons": "恶魔",
  "humans and elves": "人类和精灵", "humans": "人类", "certain monsters": "某些怪物",
  "warned of undead": "受到不死生物的警示", "automatic searching": "自动搜索",
  "clairvoyant": "拥有千里眼", " clairvoyant": "拥有千里眼", "infravision": "红外视觉",
  "sensing the presence of monsters": "感知怪物的存在", "going to confuse monsters": "将使怪物陷入混乱",
  "%scharismatic": "%s有魅力", "more ": "更", "less ": "较不",
  "invisible": "隐形", "invisible to others": "对他人隐形", "visible": "可见",
  "displaced": "错位", "stealthy": "隐匿",
  " monsters": "怪物", " conflict": "冲突", "jump": "跳跃", "teleport": "传送",
  "teleport control": "传送控制",
  " if not trapped": "，若未被困", " if you weren't levitating": "，若你没有悬浮",
  " if you weren't trapped": "，若你没有被困", " if circumstances permitted": "，若情况允许",
  " if surroundings permitted": "，若周围环境允许",
  "walk on water": "在水上行走", "swim": "游泳", "survive without air": "无需空气也能存活",
  "breathe water": "在水中呼吸", "walk through walls": "穿墙而过",
  "slower digestion": "消化更慢", "protected from shape changers": "免受变形者影响",
  "not change from your current form": "无法脱离当前形态",
  "polymorph": "变形", "have polymorphed": "已变形", "change shape": "变换形态",
  "have changed shape": "已变换形态", "would %s periodically": "会周期性地%s",
  " if not locked into your current form": "，若未被锁定在当前形态",
  "polymorphing periodically": "正周期性变形", "polymorph control": "变形控制",
  "polymorphed into %s": "变形成了%s",
  "resist": "抵抗", "resisted": "曾抵抗", "saw": "看见", "see": "看见",
  "will see": "将看见", "would have seen": "本会看见",
  "could be": "本可以是", "could have been": "本可以是",
  "You aggravate": "你激怒", "You cause": "你引发",
  "would levitate": "会悬浮", "would have levitated": "本会悬浮",
  "would fly": "会飞行", "would have flown": "本会飞行", "You regenerate": "你恢复",
  "do": "", "did": "曾", "Your alignment ": "你的信仰契合度 ",
  "warded": "受守护", "guarded": "受庇护", "protected": "受保护",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
