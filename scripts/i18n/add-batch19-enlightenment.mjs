#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // enlightenment frame (enlght_line " You are <attr>.")
  "You ": "你", "are ": "", "were ": "曾", "have ": "拥有", "had ": "曾拥有",
  "can ": "能", "could ": "曾能", "have been ": "一直", "have never ": "从未",
  "never ": "从未", " %s%s%s%s.": " %s%s%s%s。",
  // status headers
  "Final Status:": "最终状态：", "Current Status:": "当前状态：", "Background:": "背景：",
  // status conditions
  "transformed": "已变形", " and %s %s inside": "，且内心%s%s",
  "felt": "感到", "feel": "感到",
  "riding %s": "骑乘着%s", "and %s ": "和%s ",
  "levitating, at will": "可随意悬浮", "levitating": "悬浮中", "flying": "飞行中",
  "underwater": "在水下", "swimming": "游泳中", "in water": "在水中",
  "walking on %s": "行走在%s上", "water": "水", "lava": "熔岩",
  " You turned into stone.": " 你化为了石头。", "turning to stone": "正在石化",
  " You turned into slime.": " 你化为了软泥。", "turning into slime": "正在黏化",
  "buried": "被掩埋", " You died from strangulation.": " 你死于勒毙。",
  "being strangled": "正在被勒住",
  " %sdied from %s.": " %s死于%s。", "terminal illness": "绝症", "food poisoning": "食物中毒",
  "terminally sick from illness": "因疾病而病入膏肓",
  "terminally sick from food poisoning": "因食物中毒而病入膏肓",
  "nauseated": "反胃", "stunned": "眩晕", "confused": "混乱",
  "hallucinating": "处于幻觉中", "deaf": "失聪",
  "%s blind": "%s失明", "innately": "天生", "permanently": "永久",
  "deliberately": "故意", "temporarily": "暂时",
  "chained to %s": "被拴在%s上", "punished": "受罚中",
  "tethered to something buried": "被拴在埋着的东西上",
  "stuck in %s": "卡在%s里", "trapped": "被困", " in %s": "，在%s里",
  "swallowed by %s": "被%s吞下", "holding": "抓着", "held by": "被抓住，抓它的是",
  "stuck to %s %s": "粘在%s的%s上", " wounded legs": " 腿部受伤",
  "wounded %s": "受伤的%s", "slippery %s": "滑溜的%s",
  "fumble": "笨手笨脚", "fumbled": "曾笨手笨脚",
  " asleep uncontrollably": "不受控制地入睡",
  "hunger": "感到饥饿", "hungered": "曾感到饥饿", " rapidly": "，速度加快",
  " from severe hunger": "，因严重饥饿", " due to starvation": "，因濒临饿死",
  "; movement %s %s%s": "；移动%s%s%s", " slowed": "变慢",
  "unencumbered": "没有负重", "empty handed": "空手", "bare handed": "赤手",
  "slightly": "轻微地", "moderately": "中度地", "very": "非常地",
  "extremely": "极度地", "not possible": "已不可能",
  // background / identity
  "%sin %s%s form": "%s以%s%s形态", "currently ": "目前", "actually ": "实际上",
  "%s, level %d %s%s": "%s，%d级的%s%s",
  "%s, a level %d %s%s %s": "%s，%d级的%s%s%s",
  " %s%s%s, %son a mission for %s": " %s%s%s，%s为%s效力",
  "now ": "现在", "belatedly ": "迟来地", "nominally ": "名义上",
  " who %s opposed by": "，%s与以下诸神对立", "is": "是", "was": "曾",
  " %s (%s) and": " %s（%s）以及", " %s (%s)%s": " %s（%s）%s",
  " %s (%s)": " %s（%s）", " and": " 以及",
  "actually %s": "实际上是%s", " You started out %s%s%s.": " 你最初是%s%s%s。",
  " and ": " 和 ",
  "in the endgame, on the %s%s": "在终局，位于%s%s", "Elemental ": "元素",
  "on the %s level": "在%s层", "level %d": "第 %d 层",
  ", a primitive area": "，一片原始区域", ", a very big room": "，一间非常大的房间",
  "in %s, on %s": "在%s，%s",
  "just started your adventure": "刚刚开始你的冒险",
  "the dungeon %ld turn%s ago": "地牢，在 %ld 回合前", "entered ": "进入了",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
