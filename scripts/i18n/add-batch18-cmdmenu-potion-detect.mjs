#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // cmd.c extended-command menu
  "Extended Commands List": "扩展命令列表",
  "Show": "显示", "Hide": "隐藏",
  " commands that don't autocomplete": " 不会自动补全的命令",
  " (those not marked with [A])": "（未标记 [A] 的命令）",
  "Search extended commands": "搜索扩展命令",
  "Show all, clear search": "显示全部，清除搜索",
  "no matches": "无匹配项",
  "Extended command list search phrase": "扩展命令列表搜索词",
  "%s%s or %s": "%s%s 或 %s", "or ": "或 ", " or ": " 或 ",
  "Extended Command: %s": "扩展命令：%s",
  // potion.c
  "mildly ": "略微", "contaminated tap water": "受污染的自来水",
  "contaminated potion": "受污染的药水",
  "%s saddle": "%s的马鞍", "body": "身体", "head": "头部",
  "glow": "发光",
  "dip %s into": "将%s浸入", "The": "这", "%ld of the": "%ld 瓶",
  "One of %s": "%s之一",
  "clears": "变得清澈", "turns %s": "变成%s",
  " from %s heat": "，因%s的高温",
  // detect.c
  "You feel worried about your future financial situation.": "你对自己未来的财务状况感到忧虑。",
  "You feel interested in %s financial situation.": "你对%s的财务状况产生了兴趣。",
  "You feel materially poor.": "你感到物质上很贫穷。",
  "Your %s twitches%s.": "你的%s抽动了一下%s。",
  " then starts to tingle": "，接着开始发麻",
  " and/or large stones": " 和/或大块石头",
  "Your %s stop itching.": "你的%s不再发痒。",
  "underlying terrain": "底层地形", "known terrain": "已知地形",
  "%s traps": "%s陷阱", " and": " 和",
  "%s%s objects": "%s%s物品", "%s and monsters": "%s和怪物",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
