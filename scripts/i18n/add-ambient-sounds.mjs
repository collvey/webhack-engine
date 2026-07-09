#!/usr/bin/env node
/*
 * WebHack i18n — dosounds() ambient dungeon-sound strings (sounds.c). These are
 * static const char*[] arrays passed to You_hear1()/You1()/pline(); all bare
 * English ("You hear bubbling water."). Each call site is now _()-wrapped; this
 * adds the translations. Keys are the C source form (escaped quotes as \").
 * temple_msg keys are the flag-stripped form (leading * / # removed at runtime).
 * Idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  // fountain
  'bubbling water.': '冒泡的水声。',
  'water falling on coins.': '水滴落在硬币上的声音。',
  'the splashing of a naiad.': '水中仙女的戏水声。',
  'a soda fountain!': '苏打水喷泉！',
  // sink
  'a slow drip.': '缓慢的滴水声。',
  'a gurgling noise.': '汩汩的水声。',
  'dishes being washed!': '洗碗的声音！',
  // throne (index 2 drops the uhis() %s -> full-width quotes in value)
  'the tones of courtly conversation.': '宫廷交谈的语调。',
  'a sceptre pounded in judgment.': '权杖敲下宣判的声音。',
  'Someone shouts \\"Off with %s head!\\"': '有人喊道“砍掉他的头！”',
  // swamp (You1 -> "You " prefix)
  'hear mosquitoes!': '听到蚊子的声音！',
  'smell marsh gas!': '闻到沼气！',
  'hear Donald Duck!': '听到唐老鸭的声音！',
  // barracks
  'blades being honed.': '磨刀的声音。',
  'loud snoring.': '响亮的鼾声。',
  'dice being thrown.': '掷骰子的声音。',
  'General MacArthur!': '麦克阿瑟将军！',
  // zoo
  'a sound reminiscent of an elephant stepping on a peanut.': '一种像大象踩在花生上的声音。',
  'a sound reminiscent of a seal barking.': '一种像海豹吠叫的声音。',
  'Doctor Dolittle!': '杜立德医生！',
  // shop
  'someone cursing shoplifters.': '有人在咒骂扒手。',
  'the chime of a cash register.': '收银机的叮当声。',
  'Neiman and Marcus arguing!': '尼曼和马库斯在争吵！',
  // temple (flag-stripped keys)
  'someone praising %s.': '有人在赞美%s。',
  'someone beseeching %s.': '有人在祈求%s。',
  'an animal carcass being offered in sacrifice.': '一具动物尸体被献作祭品。',
  'a strident plea for donations.': '刺耳的募捐恳求。',
  // oracle
  'a strange wind.': '一阵奇怪的风。',
  'convulsive ravings.': '痉挛的胡言乱语。',
  'snoring snakes.': '打鼾的蛇。',
  'someone say \\"No more woodchucks!\\"': '有人说“不要再有土拨鼠了！”',
  'a loud ZOT!': '一声响亮的“ZOT”！',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
