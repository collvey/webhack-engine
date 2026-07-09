#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // attrib.c innate-ability gain/lose descriptors
  'perceptive': '敏锐', 'quick': '敏捷', 'slow': '迟缓', 'stealthy': '隐秘',
  'sensitive': '警觉', 'healthy': '健康', 'cool': '凉爽', 'warm': '温暖',
  'warmer': '更暖', 'cooler': '更凉', 'insulated': '绝缘', 'conductive': '导电',
  'controlled': '受控', 'uncontrolled': '失控', 'hardy': '强健', 'unaware': '迟钝',
  'innately weaker': '天生更弱', 'sick inside': '内里不适',
  'exercising diligently': '勤奋锻炼', 'exercising properly': '正确锻炼',
  'very observant': '非常留心', 'paying attention': '集中注意',
  'working on your reflexes': '锻炼你的反应', 'working on reflexes lately': '近来锻炼反应',
  'leading a healthy life-style': '过着健康的生活方式', 'watching your health': '关注你的健康',
  'Cha?': '魅力？', ' because of %s': '，因为%s',
  // sounds.c monster sound verbs + dialogue
  'yowl': '嚎叫', 'arch': '弓背', 'yelp': '尖吠', 'recoil': '退缩', 'snarl': '咆哮',
  'bluff': '虚张声势', 'squeal': '尖叫', 'quiver': '颤抖', 'screak': '尖鸣',
  'thrash': '乱扑', 'wail': '哀嚎', 'cringe': '畏缩', 'whimper': '呜咽', 'whine': '哀鸣',
  'I vant to suck your %s!': '我想吸你的%s！',
  'I vill come after %s without regret!': '我会毫不留情地追杀%s！',
  'scared by rattling': '被响声吓到',
  'giggles.': '咯咯笑。', 'chuckles.': '轻声笑。', 'snickers.': '窃笑。', 'laughs.': '大笑。',
  'Huh?': '啊？', 'What?': '什么？', 'Eh?': '嗯？',
  'Phase one, collect underpants.': '第一步，收集内裤。',
  'Phase three, profit!': '第三步，盈利！',
  'complains about unpleasant dungeon conditions.': '抱怨地牢环境恶劣。',
  'asks you about the One Ring.': '向你打听至尊魔戒。',
  'describes a recent article in "Spelunker Today" magazine.': '描述《今日洞穴探险》杂志上的一篇近期文章。',
  'Anything you say can be used against you.': '你所说的一切都将成为呈堂证供。',
  "You're under arrest!": '你被捕了！', 'Stop in the name of the Law!': '以法律的名义，站住！',
  "Doc, I can't help you unless you cooperate.": '医生，你不配合我就帮不了你。',
  'Please undress so I can examine you.': '请脱下衣物，好让我检查。',
  'Resistance is useless!': '抵抗是徒劳的！', "You're dog meat!": '你死定了！', 'Surrender!': '投降吧！',
  "What lousy pay we're getting here!": '我们这儿的薪水真差劲！',
  "The food's not fit for Orcs!": '这伙食连兽人都不配吃！',
  "My feet hurt, I've been on them all day!": '我的脚好痛，站了一整天了！',
  // timeout.c
  'extremities': '四肢', 'getting stoned': '石化中',
  'are feeling mildly nauseated.': '感到有点恶心。', 'feel slightly confused.': '感到有些迷糊。',
  "can't seem to think straight.": '没法好好思考了。', 'feel incredibly sick.': '感到极度难受。',
  'are about to vomit.': '就要吐了。',
  'You find it hard to breathe.': '你感到呼吸困难。', "You're gasping for air.": '你大口喘着气。',
  'You can no longer breathe.': '你再也无法呼吸了。', "You're turning %s.": '你变得%s。',
  'You suffocate.': '你窒息了。',
  'Your %s is becoming constricted.': '你的%s开始收缩。',
  'Your blood is having trouble reaching your brain.': '你的血液难以流到大脑。',
  'The pressure on your %s increases.': '你%s上的压力增大了。',
  'Your consciousness is fading.': '你的意识正在消退。',
  'You float slightly lower.': '你略微下沉了一点。',
  'You wobble unsteadily %s the %s.': '你在%s%s上摇晃不稳。',
  'The slime that covers you is burned away!': '覆盖你的黏液被烧掉了！',
  'You start to feel bloated.': '你开始感到腹胀。',
  'You are feeling rather flabby.': '你感到相当松垮。',
  'fumbling': '笨手笨脚', 'sleeping': '沉睡', 'You wake up.': '你醒了过来。',
  'a rock': '一块石头', 'some rocks': '一些石头', ' considerably': '显著地',
  'hiding from thunderstorm': '躲避雷暴',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
