#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // engrave.c ceiling() descriptors + finish messages
  "vault's ceiling": '金库的天花板', "temple's ceiling": '神庙的天花板',
  "shop's ceiling": '商店的天花板', 'water above': '上方的水', 'sky': '天空',
  "water's surface": '水面', 'rock cavern': '岩石洞窟',
  'You finish your weird engraving.': '你完成了诡异的刻写。',
  'You finish writing in the dust.': '你在尘土上写完了。',
  'You finish engraving.': '你完成了刻写。',
  'You finish melting your message into the ice.': '你把讯息熔进了冰里。',
  'You finish burning your message into the floor.': '你把讯息烧进了地板。',
  'You finish defacing the dungeon.': '你完成了对地牢的涂画。',
  'You finish scrawling.': '你潦草地写完了。',
  'You cannot write any more.': '你无法再写下去了。',
  // dokick.c
  'kick passes harmlessly through': '踢无害地穿过', 'cracking': '开裂',
  'kicking %s barefoot': '赤脚踢%s',
  'scatter the coins': '把硬币踢散', 'knock coins all over the place': '把硬币踢得到处都是',
  'send coins flying in all directions': '让硬币四处飞散',
  'a door': '一扇门', 'a throne': '一座王座', 'a fountain': '一座喷泉',
  'a headstone': '一块墓碑', 'a sink': '一个水槽', 'an altar': '一座祭坛',
  'a drawbridge': '一座吊桥', 'a ladder': '一架梯子', 'an iron bar': '一根铁栏',
  'something weird': '某种怪东西', 'kicking ': '踢',
  'metal boots': '金属靴',
  "Halt, thief!  You're under arrest!": '站住，小偷！你被捕了！',
  'Hey, stop damaging that door!': '喂，别再破坏那扇门了！',
  'object falls': '物体掉落', 'objects fall': '物体掉落', 'crash': '砰',
  ' %s %s object%s': '%s%s物体%s', 'other': '其他', ' and %s %s.': '，%s%s。',
  'down the stairs': '沿楼梯而下', 'down the ladder': '沿梯子而下',
  'through the hole': '穿过洞口', 'hit': '击中',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
