#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  "don't have enough elbow-room to maneuver.": '没有足够的活动空间来施展。',
  'lenses': '镜片', 'other towel': '另一条毛巾', 'blindfold': '眼罩',
  'fine': '良好', 'extraordinary': '极其出色', 'remarkable': '非凡',
  'thing': '东西',
  'produce a %s whistling sound.': '发出%s的口哨声。',
  'produce a %s, sharp vibration.': '发出%s、尖锐的震动。',
  'beautiful': '美丽', 'handsome': '英俊', 'ugly': '丑陋',
  'gazing into a mirror': '凝视镜子',
  'The gaze is reflected away by %s %s!': '目光被%s%s反射开了！',
  'candles': '蜡烛', 'candle': '蜡烛',
  'Attach ': '安装',
  'them': '它们',
  'You drop %s!': '你丢下了%s！',
  'the desired position': '目标位置',
  'jumping around': '四处跳跃',
  'You tin it, you bought it!': '你把它装罐，就得买下它！',
  'You make, but cannot pick up, %s.': '你制作了%s，但无法捡起。',
  '"scritch, scritch"': '“吱吱，吱吱”',
  'waxy': '蜡质的', 'wooden': '木质的', 'golden': '金色的', 'silvery': '银色的',
  // "can't do X %s!" activity/location suffixes
  'setting the trap': '布置陷阱', 'without hands': '没有手', 'while stunned': '眩晕时',
  'while swallowed': '被吞下时', 'while engulfed': '被吞没时', 'underwater': '在水下',
  'while levitating': '悬浮时', 'in water': '在水中', 'in lava': '在熔岩中',
  'on the ladder': '在梯子上', 'on the stairs': '在楼梯上', 'here': '在这里',
  'in midair': '在半空中', 'in a cloud': '在云中', 'in this place': '在此处',
  'The bullwhip slips free.': '牛皮鞭滑脱了。', 'Snap!': '啪！',
  'lash': '抽打', 'swing': '挥舞', 'cast': '施放',
  'a boulder': '一块巨石',
  "There's not enough room here to use that.": '这里没有足够的空间来使用它。',
  'Where do you want to hit?': '你想击打哪里？',
  "won't hit anything if you can't see that spot.": '如果看不到那个位置就击打不到任何东西。',
  "can't reach that spot from here.": '从这里够不到那个位置。',
  'the spot to hit': '要击打的位置',
  'Aim for what?': '瞄准什么？',
  'But nothing else happens...': '但没有别的事发生……',
  'Are you really sure you want to break ': '你真的确定要折断',
  'the wand': '这根魔杖',
  'Some holes are quickly filled with %s!': '一些洞很快被%s填满了！',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
