#!/usr/bin/env node
/* i18n batch translations (auto-wrapped catalog-gaps): trap/shk/eat/misc fragments. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  "your": "你的", "the": "", "The": "", "an": "", "a ": "", "A ": "",
  "swoop": "俯冲", "deliberately drop": "故意扔下", "through the trap door": "穿过陷阱门",
  "into the gaping hole": "掉进裂开的大洞里", "deep ": "深", "burn": "燃烧", "dissolve": "溶解",
  "burns": "燃烧", "dissolves": "溶解", "float": "漂浮", "fly": "飞行", "vibrates": "震动",
  "squeaks ": "吱吱作响", " loudly": "，声音很大", "spiked ": "带尖刺的", "full of spikes ": "布满尖刺的",
  " between the pits": "在坑之间", "poor": "可怜的", "steps": "踩上", "lands": "落地", "step": "踩上",
  "You take a walk on your web.": "你在自己的网上走了一圈。", "There is a spider web here.": "这里有一张蜘蛛网。",
  "unbearably torpid!": "难以忍受地迟钝！", "very lethargic.": "非常懒散。", "sluggish.": "迟缓。",
  "There is": "有", "You discover": "你发现了", "the trigger of your mine": "你的地雷的触发装置",
  "a trigger": "一个触发装置", "Your inept attempt sets": "你笨拙的尝试触发了", "The air currents set": "气流触发了",
  " land mine": "地雷", " The rolling boulder triggers a land mine.": " 滚动的巨石触发了一颗地雷。",
  "nearby": "在附近", "in the distance": "在远处", "a land mine": "一颗地雷", "KAABLAMM!!!  ": "轰隆隆！！！  ",
  "You hear": "你听到", "a rolling boulder trap": "滚石陷阱", "float away from the %s.": "从%s飘走。",
  "spiral up into %s.": "螺旋上升进入%s。", "trap's jaws": "陷阱的钳口", "chain": "锁链",
  "swallowed": "被吞没", "engulfed": "被吞噬", "splashed down": "溅落", "hit the ground": "落地",
  "climb": "攀爬", "struggle against the air currents and float": "在气流中挣扎着漂浮", "ride": "骑乘",
  "crawl": "爬行", "You've fallen, and you can't get up.": "你摔倒了，爬不起来。", "You are still in a pit.": "你还困在坑里。",
  "bursts": "爆开", "erupts": "喷发", "the moon howling at you.": "月亮在对你嚎叫。", "distant howling.": "远处的嚎叫。",
  "oddly ": "古怪地", "Cleveland": "克利夫兰", "The Quest": "任务之地", "your nearby homeland": "你附近的家园",
  "your distant homeland": "你遥远的家园", "smell hamburgers.": "闻到汉堡的味道。", "smell charred flesh.": "闻到烧焦的肉味。",
  "They": "它们", "It": "它", "fade": "褪去", "Some": "一些", "Another": "又一个", "More": "更多",
  "dilute": "稀释", "plunge": "猛地插入", "in an air bubble": "在气泡中", "on land": "在陆地上",
  "webbing": "蛛丝", "carrying too much": "负重过多", "too heavy": "太重", "here": "这里", "there": "那里",
  " while mounted": "（骑乘时）", " that you're stuck in": "（你困在其中）", " while standing on the edge of it": "（站在它边缘时）",
  " in it": "（在其中）", "find no other traps here.": "在这里没找到其他陷阱。", "know of no traps here.": "不知道这里有陷阱。",
  "trigger a trap!": "触发了一个陷阱！", "stagger": "踉跄", " and get dizzy": "并感到眩晕", " and your vision blurs": "视线也变得模糊",
  "burst": "爆裂", "dark red": "暗红色", ", but it only burns slightly": "，但只是轻微灼伤",
  " and are about to be immolated": "即将被烧死", "%s!  Please pay before leaving.": "%s！  离开前请付款。",
  "%s!  Don't you leave without paying!": "%s！  没付款别想走！", "points out": "指出", "makes it clear": "明确表示",
  "seems to be": "似乎", "deserted": "空无一人", "untended": "无人看管", " again": "又一次",
  "Will you please leave your %s%s outside?": "请把你的%s%s留在外面好吗？", "Leave the %s%s outside.": "把%s%s留在外面。",
  "is hesitant": "犹豫不决", "refuses": "拒绝", "Will you please leave %s outside?": "请把%s留在外面好吗？",
  "Leave %s outside.": "把%s留在外面。", "doesn't want": "不希望", "glares at": "怒视着", "is dismayed because of": "因……而沮丧",
  "wakes up": "醒了过来", "can move again": "又能动了", "sense": "感觉到", "seems to be napping": "似乎在打盹",
  "doesn't respond": "没有回应", "seem to ": "似乎", " openly kept": "公开持有的", " seem to": "似乎",
  "partially ": "部分", "angry": "愤怒的", " or credit": "或赊账", " left": "剩下", " any of": "任何",
  "Pay": "付款", "Please pay": "请付款", "this one": "这一件", "angrily ": "愤怒地", "motions to": "示意",
  "wakes up, ": "醒了过来，", "disappears": "消失了", "sighs": "叹了口气", "you ": "你", "horrified": "惊恐",
  "concerned": "担忧", "per": "每", "for the contents of this": "为这里面的东西", "for this": "为这件",
  " in the rest": "为其余的", " reaches over and": "伸手过来并", "some": "一些", "close": "关闭",
  "the shop door reappears": "店门重新出现了", " and ": "和", "the floor damage is gone": "地板的破损修复了",
  "an incantation": "一段咒语", "something": "某物", "madam": "女士", "sir": "先生", "Madam": "女士", "Sir": "先生",
  "leap": "跳跃", "shop": "商店", "mentions": "提到", "indicates": "表示", "non-paying": "不付款的", "rude": "粗鲁的",
  "says": "说", "reminds you": "提醒你", "complains": "抱怨", "indicates concern": "表示担忧",
  " senses your motion and": "察觉到你的动作，并", "to your credit; total is now": "记入你的赊账；现在总计",
  "had the audacity to mix": "竟敢混合", "just mixed": "刚刚混合了", " stinking batch!": "臭烘烘的一批！",
  "are filthier than ever": "比以往任何时候都更脏了", "get slimy": "变得黏糊糊的", "has more": "有更多",
  "now has": "现在有", "cock-eyed": "斗鸡眼的", "crooked": "歪斜的", " mostly": "大部分", "Those": "那些",
  "passage": "通道", "leash %s from inside.": "从里面拴住%s。", "unleash %s from inside.": "从里面解开%s。",
  "unleash anything from inside %s.": "从%s里面解开任何东西。", "un": "解", "cannot be": "无法",
  "is not": "不是", "creature": "生物", "your ": "你的", "peaked": "面色苍白", "undernourished": "营养不良",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
