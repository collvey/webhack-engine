#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // bill / owe
  "You owe %s %ld %s ": "你欠 %s %ld %s ",
  "you picked up in the store.": "，那是你在店里捡起的。",
  "for gold picked up and the use of merchandise.": "，用于捡起的金子以及商品的使用。",
  "for the use of merchandise.": "，用于商品的使用。",
  "still ": "仍然",
  "%sowe %s %ld %s": "%s欠 %s %ld %s",
  " for %s%sits contents": "，用于%s%s它的内容物",
  "it and ": "它以及 ", "some of ": "部分 ",
  " for %s": "，用于%s",
  "Will you accept %ld %s in credit for ": "你愿意接受 %ld %s 的赊账，换取",
  "%s offers%s %ld gold piece%s for %s%s ": "%s%s出价 %ld 枚金币%s，收购%s%s",
  " only": "仅", "your item in ": "你在其中的物品 ", "your items in ": "你在其中的物品 ",
  "%s.  Sell %s?": "%s。出售%s吗？",
  " and item inside": "及其内的物品", " and items inside": "及其内的物品",
  "that": "那个", "those": "那些",
  "Unpaid articles already used up:": "已用完的未付款物品：",
  "Fine goods for sale:": "出售中的精品：",
  "no charge": "免费",
  // death: shk takes possessions
  ", shakes %s %s,": "，摇了摇%s%s，",
  "wakes up and ": "醒来，然后", "comes and ": "走过来，然后", "takes": "拿走",
  "%%s; you %s": "%%s；你%s",
  // shk address / honorifics
  "\"For you, ": "“为你，",
  "scum;": "人渣；", "; only": "；只需",
  "good": "善良的", "honored": "尊敬的", "most gracious": "最仁慈的",
  "esteemed": "受人敬重的", "most renowned and sacred": "最负盛名而神圣的",
  " dark lady": " 黑暗女士", " dark lord": " 黑暗领主",
  " hiril": " 精灵女士", " hir": " 精灵先生",
  " creature": " 生物", " lady": " 女士", " sir": " 先生",
  // trap untrap
  "%s trap%s": "%s陷阱%s", "several": "几个",
  " removed from the %s": "从%s上被移除", "doorway": "门口", "floor": "地板",
  "section%s": "段%s",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
