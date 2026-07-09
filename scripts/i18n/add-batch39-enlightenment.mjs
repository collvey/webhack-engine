#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // enlght_line frame  (" %s%s%s%s." -> "%s%s%s%s。")
  ' %s%s%s%s.': '%s%s%s%s。',
  'You ': '你', 'are ': '是', 'were ': '曾是', 'have ': '拥有', 'had ': '曾拥有',
  'can ': '能', 'could ': '曾能', 'have been ': '一直', 'have never ': '从未', 'never ': '从未',
  // damage / attribute magnitudes
  'small': '较小', 'moderate': '中等', 'large': '较大', 'huge': '巨大',
  'bonus': '加成', 'penalty': '减益',
  'physical': '物理', 'spell': '法术',
  ' %s %s damage': '%s%s伤害', 'half': '一半', 'reduced': '降低',
  'take': '受到', 'took': '受到过',
  "%s the %s's attributes:": '%s%s的属性：',
  // moon / time  ("It is <noun>")
  'It ': '现在', 'is ': '是', 'was ': '曾是',
  'the midnight hour': '午夜时分', 'nighttime': '夜晚', 'full': '满月',
  'energy points (spell power)': '能量点（法力）',
  'Your wallet ': '你的钱包', ' (current; ': '（当前；',
  'you and ': '你和', 'is': '是', 'was': '曾是',
  ' has': '有', ' had': '曾有',
  'fall': '坠落', 'fell': '坠落过',
  'not wielding anything': '没有持握任何东西',
  ' if surroundings permitted': '（若环境允许）',
  ' if not for ': '，若非', ' and': '和',
  'lay eggs': '产卵', ' in beast form': '以兽形',
  'harmed by silver': '受银所伤', 'very fast': '非常快', 'fast': '快速',
  'reflection': '反射', 'free action': '自由行动', 'fixed abilities': '固定能力',
  'Your life ': '你的生命', 'will be': '将会', 'would have been': '本会', ' saved': '被拯救',
  '%s%slucky': '%s%s幸运', 'extremely ': '极其', 'un': '不',
  'Your luck ': '你的运气', ' zero': '为零', 'extra luck': '额外运气', 'reduced luck': '降低的运气',
  ' %sangry with you': '%s对你感到愤怒', ' is': '是', ' was': '曾是',
  '%s%ssafely pray%s': '%s%s安全祈祷%s', 'not ': '不能', 'ed': '过',
  '%ssafely pray': '%s安全祈祷',
  'Fruit #%d ': '水果 #%d ', 'The current fruit ': '当前水果',
  'The made fruit flag ': '已制水果标志',
  'have been killed ': '已被杀死',
  // conduct/attributes summary
  'Starting': '初始', 'Current': '当前',
  'role (base)': '职业（基础）', 'gender (base)': '性别（基础）',
  'Deities': '神祇', 'Chaotic': '混乱', 'Neutral': '中立', 'Lawful': '守序',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
