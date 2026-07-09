#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // apply.c
  "You're both stoned": "你们俩都被石化了",
  "%s's dead": "%s死了", "They're dead": "它们死了",
  "This ": "这个", "That ": "那个", "person": "人",
  "trying to tin %s without gloves": "不戴手套就试图给%s装罐",
  " and %s under %s": "，%s到%s下方", "crawl": "爬",
  " and vanish": "，随即消失",
  "rub on the stone%s": "在石头%s上摩擦", "stone%s": "石头%s",
  "killed %sself with %s bullwhip": "被自己的牛皮鞭害死",
  "killed %sself by breaking a wand": "因折断魔杖而害死自己",
  "an object on the %s": "%s上的一件物品", "the %s": "%s",
  // invent.c
  " [%s or ?*]": "，[%s 或 ?*]",
  "gloved": "戴手套的", "bare": "赤裸的",
  "%s contents": "%s的内容物", "Total:": "总计：",
  "%saltar to %s (%s)": "%s祭坛，献给%s（%s）",
  "Contents of %s %s": "%s%s的内容物",
  "You feel": "你感觉到",
  "touching %s bare-handed": "赤手触碰%s",
  "possessions": "财物", "armament": "武装",
  // mhitu.c
  " in a shower of sparks": "，在一阵火花四溅中",
  " in a blast of frost": "，在一阵寒霜爆发中",
  " with a squelch": "，伴随一声黏腻的挤压",
  "You appear to be %s again.": "你似乎又变回了%s。",
  "yourself": "你自己",
  "creature": "生物",
  "%s appears": "%s出现了", "%s appear": "%s出现了",
  "%s by %s": "%s，被%s",
  "touch of death": "死亡之触",
  "She": "她", "He": "他",
  "\"Shall I remove your %s, %s?\"": "“要我帮你脱下%s吗，%s？”",
  "lover": "爱人", "dear": "亲爱的", "sweetheart": "心上人",
  "let me run my fingers through your %s": "让我用手指抚过你的%s",
  // mon.c
  "%s engulfs %s.": "%s吞没了%s。",
  "%s suddenly %s and rises as %%s!": "%s突然%s，化为%%s重新站起！",
  "seemingly dead": "看似已死的", "reconstitutes": "重新组合", "transforms": "变形",
  "%s explosion": "%s爆炸",
  "The lapidifying %s %s %s": "正在石化的%s%s%s",
  "coalesces on the": "凝结于", "drops to the": "跌落到", "writhes on the": "扭动于",
  " which was a shapeshifted %s": "，那是变形而来的%s",
  "'s stomach": "的胃",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
