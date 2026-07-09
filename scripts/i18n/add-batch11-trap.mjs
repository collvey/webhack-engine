#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
// upsert: these OVERWRITE (to fix verb-composition of pre-existing formats)
const upsert = {
  "%s into %s pit!": "%s进了%s坑里！",
  "%s %s spider web!": "%s%s蜘蛛网！",
  "%s a polymorph trap!": "%s变形陷阱！",
};
// add-only
const add = {
  "a": "",
  "and %s fall": "和%s一起",
  "lead %s": "带着%s",
  "poor": "可怜的",
  "fall": "摔落",
  "dive": "俯冲",
  "plunge": "坠落",
  "are caught by": "被困于",
  "lead %s into": "带着%s陷入",
  "%s into": "%s进",
  "float": "飘",
  "stumble": "跌撞",
  "trigger": "触发了",
  "lead %s onto": "带着%s踏上",
  "%s onto": "%s踏上",
  "step": "踏",
  "The hole in the %s above you closes up.": "你上方%s的洞口闭合了。",
  "statue": "雕像",
  "a statue": "一座雕像",
  "%s corpse": "%s的尸体",
  "trying to help %s out of a pit": "试图把%s拉出坑",
  " and ": "和",
  "containers": "容器",
  "There %s and %s here.  %s %s?": "这里有%s和%s。要%s%s吗？",
  "is a container": "一个容器",
  "are containers": "几个容器",
  "Remove": "移除",
  "Disarm": "拆除",
  "%s is": "%s",
  "You are": "你",
  "exploding %s": "使%s爆炸",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0, u = 0;
for (const [k, v] of Object.entries(upsert)) { if (json[k] !== v) u++; json[k] = v; }
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, upserted ${u}, skipped ${d}, total ${Object.keys(json).length}`);
