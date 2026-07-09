#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // priest.c mstatusline / ustatusline (stethoscope/probe feedback)
  ", tame": "，驯服", "; hungry %ld; apport %d": "；饥饿度 %ld；拾取欲 %d",
  ", peaceful": "，平和",
  ", single segment": "，单节", ", %d%s of %d segments": "，第 %d%s 节，共 %d 节",
  ", shapechanger": "，变形者", ", eating": "，进食中",
  ", cancelled": "，已被消除", ", confused": "，混乱", ", blind": "，失明",
  ", stunned": "，眩晕", ", asleep": "，睡眠中", ", can't move": "，无法移动",
  ", meditating": "，冥想中", ", scared": "，恐惧", ", trapped": "，被困",
  ", fast": "，迅捷", ", slow": "，迟缓", ", [? speed]": "，[? 速度]",
  ", invisible": "，隐形",
  ", held by you": "，被你抓住", ", holding you": "，抓住你",
  ", digesting you": "，正在消化你", ", swallowing you": "，正在吞下你",
  ", engulfing you": "，正在吞没你", ", carrying you": "，载着你",
  ", dying from": "，濒死于", " food poisoning": " 食物中毒", " and": " 和",
  " illness": " 疾病", ", solidifying": "，正在石化",
  ", becoming slimy": "，正在黏化", ", being strangled": "，正在被勒住",
  ", nauseated": "，反胃",
  ", blind, covered by sticky goop": "，失明，被黏液覆盖",
  ", blinded by sticky goop": "，被黏液弄瞎",
  ", injured %s": "，%s受伤", ", slippery %s": "，%s滑溜",
  ", very fast": "，非常迅捷", ", concealed": "，隐蔽",
  ", holding ": "，抓着 ", ", held by ": "，被抓住，来自 ",
  // priest.c naming / temple
  "renegade ": "叛教的", "high ": "高阶", "poohbah": "大人物",
  "priestess": "女祭司", "priest": "祭司", "guardian ": "守护的",
  "Pilgrim, you enter a %s place!": "朝圣者，你踏入了一处%s之地！",
  "desecrated": "被亵渎的", "sacred": "神圣的",
  // topten.c high-score display
  ", while %s": "，在%s期间", ", while helpless": "，在无助之时",
  " No  Points     Name": "  序号    分数        姓名", "Hp [max]": "生命 [上限]",
  "Since you were in %s mode, the score list will not be checked.": "由于你处于 %s 模式，将不检查分数榜。",
  "You didn't beat your previous score of %ld points.": "你没有超过之前 %ld 点的分数。",
  "You reached the %d%s place on the top %d list.": "你排到了第 %d%s 位，位列前 %d 名榜单。",
  "escaped the dungeon %s[max level %d]": "逃出了地牢 %s[最高层 %d]",
  "ascended to demigod%s-hood": "飞升成为半神%s",
  "dess": "女",
  "starved to death": "饿死", "choked on own food": "被自己的食物噎死",
  "was poisoned": "中毒身亡", "was crushed to death": "被压死",
  " in %s": "，在%s", " on level %d": "，第 %d 层", " [max %d]": "（最高 %d）",
  "Cannot find any %sentries for ": "找不到任何%s条目，属于：",
  "current ": "当前的 ", "you.": "你。", "any of ": "以下任意：",
  "Cannot open log file!": "无法打开日志文件！",
  "Cannot open extended log file!": "无法打开扩展日志文件！",
  "Cannot open record file!": "无法打开记录文件！",
  "Cannot write record file": "无法写入记录文件",
  // ordinal suffixes -> empty for zh
  "st": "", "nd": "", "rd": "", "th": "",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
