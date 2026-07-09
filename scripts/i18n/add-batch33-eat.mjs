#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // foodwords[] — oc_material names ("choke over your %s")
  'meal': '餐食', 'liquid': '液体', 'wax': '蜡', 'food': '食物', 'meat': '肉',
  'paper': '纸', 'cloth': '布', 'leather': '皮革', 'wood': '木头', 'bone': '骨头',
  'scale': '鳞片', 'metal': '金属', 'silver': '银', 'gold': '金', 'platinum': '铂',
  'mithril': '秘银', 'plastic': '塑料', 'glass': '玻璃', 'rich food': '油腻食物', 'stone': '石头',
  // messages
  'brainlessness': '无脑',
  'You now prefer mimicking yourself.': '你现在更喜欢模仿自己了。',
  'Your rind escaped intact.': '你的外皮完好无损地逃脱了。',
  'chicken': '鸡肉',
  '%s %s of ': '%s%s，内含', ' of %s ': '，%s口味的', '%s meat': '%s肉',
  'You succeed in opening the tin.': '你成功打开了锡罐。',
  'You bite right into the metal tin...': '你一口咬在金属锡罐上……',
  'The tin opens like magic!': '锡罐如魔法般打开了！',
  'You easily open the tin.': '你轻松打开了锡罐。',
  'opening the tin': '打开锡罐',
  'world spins and %s %s.': '世界天旋地转，%s%s。',
  'goes': '陷入', 'dark': '黑暗',
  'you lose control of': '你失去了对……的控制', 'yourself': '自己',
  'you slap against the': '你撞上了', 'saddle': '鞍具',
  'unconscious from rotten food': '因腐烂食物而昏迷',
  'You are conscious again.': '你恢复了知觉。',
  'rotted': '腐烂的',
  'eating non-food': '进食非食物',
  'Really wield ': '真的要持握', 'use': '使用',
  "You're finally finished.": '你终于吃完了。',
  'You revive.': '你复活了。',
  'fainted from lack of food': '因缺乏食物而昏厥',
  'You regain consciousness.': '你恢复了意识。',
  'Falling, you': '坠落中，你',
  'There %s ': '这里%s', ' here; %s %s?': '；%s%s吗？', 'things': '一些东西',
  'vomiting': '呕吐',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
