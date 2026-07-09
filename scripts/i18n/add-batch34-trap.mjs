#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // erosion: action[]/msg[]/bythe[]
  'smoulder': '冒烟', 'corrode': '腐蚀',
  'burnt': '烧焦', 'rusted': '生锈', 'corroded': '被腐蚀',
  'heat': '高温', 'oxidation': '氧化', 'decay': '腐坏', 'corrosion': '腐蚀',
  // blindgas[] smells
  'humid': '潮湿', 'odorless': '无味', 'pungent': '刺鼻', 'chilling': '冰冷',
  'acrid': '辛辣', 'biting': '刺激',
  'A gush of water hits': '一股水流击中',
  // tnnames[] music notes
  'C note': 'C音', 'D flat': '降D音', 'D note': 'D音', 'E flat': '降E音',
  'E note': 'E音', 'F note': 'F音', 'F sharp': '升F音', 'G note': 'G音',
  'G sharp': '升G音', 'A note': 'A音', 'B flat': '降B音', 'B note': 'B音',
  // messages / fragments
  ' completely': '彻底', ' further': '进一步',
  'protected by the layer of grease!': '被那层油脂保护住了！',
  "don't fall in.": '没有掉进去。', "don't fit through.": '穿不过去。',
  'are jerked back by your pet!': '被你的宠物拽了回来！',
  'that the historic statue is now gone': '那尊历史雕像如今不复存在',
  'disappears': '消失了', 'turns into flesh': '变成了血肉',
  'moves': '动了起来', 'comes to life': '活了过来',
  'on a set of sharp iron spikes': '在一排锋利的铁钉上',
  ' as one boulder sets another in motion': '，一块巨石带动了另一块',
  ' as one boulder hits another': '，一块巨石撞上了另一块',
  'falls': '掉落', 'is dragged': '被拖拽',
  'The explosion awakens you!': '爆炸把你惊醒了！',
  'Suddenly you wake up!': '你突然醒了过来！',
  'ground': '地面', 'your anchor': '你的锚',
  'frozen by a trap': '被陷阱冻住',
  'You sink deeper into the lava.': '你陷入熔岩更深了。',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
