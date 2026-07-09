#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  "axe": "斧", "remain": "保持", "wielded": "手持的", "as secondary weapon": "作为副武器", "tool": "工具",
  "aren't weapons": "不是武器", "isn't a weapon": "不是武器", "fuse, and become": "熔合，变成", "faintly glow": "微微发光",
  "violently glow": "剧烈发光", "flin": "退缩", "detect": "探测", "of features under cursor ": "光标下地形的", "on": "开启",
  "off": "关闭", "Using": "正在使用", "Not using": "未使用", "under you": "在你脚下", "decide": "决定", "decides": "决定",
  "boiling": "沸腾", "boils away": "沸腾蒸发", "melting": "熔化", "melts away": "熔化消失", "burns to a crisp": "烧成焦炭",
  "money": "钱", "probably ": "很可能", "appears": "出现", "arrives": "到来", "emerge from": "从……中钻出", "break out of": "冲出",
  "an ": "", " strong": "强烈", "appear to ": "似乎", " and beckons": "，并招手示意", "r stuff": "的东西",
  " calms down and": "冷静下来，并", " from beneath you": "从你脚下", "consume": "吞噬", "drop that hidden money and ": "放下藏起的钱，并",
  "drop that money and ": "放下那些钱，并", "the shrill sound of a guard's whistle": "警卫刺耳的哨声", "angry shouting": "愤怒的叫喊",
  "see %s approaching.": "看到%s正在靠近。", "are confronted by %s.": "遭遇了%s。", "currently": "目前", "already": "已经",
  "improved": "提升了", "declined": "下降了", "were": "曾是", "was": "曾是", "must have been": "一定曾是", "haven't been": "并未",
  "sudden ": "突然", "much of a muchness": "半斤八两", "back in sync with your body": "重新与身体同步", "monsters": "怪物",
  "objects": "物品", "on the map": "在地图上", " woven": "编织的", " dug": "挖掘的", " set": "布设的", " by you": "由你",
  "  (For ESC, type it twice.)": "  （对于 ESC，请按两次。）", "the rest ": "其余的", " on your shopping bill": "在你的购物账单上",
  "try": "尝试", "look around": "四处查看", "floating here": "漂浮在此", "Including": "包括", "They're": "它们是", "It's": "它是",
  ", unfortunately": "，可惜", "to adjust": "以调整", "adjustable": "可调整", "meager ": "微薄的", "rump": "臀部", "underside": "腹部",
  " massive": "强烈的", "Sire": "陛下", "You may think you are a platypus, but a male still": "你也许以为自己是鸭嘴兽，但雄性仍然",
  "Males": "雄性", "the magic-absorbing blade": "吸魔之刃", "tawt you taw a puttie tat": "偶好像瞅见一只小猫咪",
  "thought you saw something": "以为你看见了什么", "solid rock": "坚固的岩石", "set the figurine beside you": "把小雕像放在身旁",
  "release the figurine": "释放小雕像", "toss the figurine into the air": "把小雕像抛向空中", "set the figurine on the ground": "把小雕像放在地上",
  "supposedly ": "据说", "more ": "更", "covered by a towel": "被毛巾盖住", "wearing a blindfold": "戴着眼罩", "wearing lenses": "戴着镜片",
  "peculiarly sad": "莫名地悲伤", "melancholy": "忧郁", "belches feebly, shrivels up and dies": "有气无力地打了个嗝，蜷缩起来死去",
  "coughs spasmodically and collapses": "痉挛地咳嗽着倒下", "vomits violently and drops dead": "剧烈呕吐后倒毙", "queasy": "反胃",
  "strangely sad": "莫名悲伤", "continues": "继续", "starts": "开始", "presence": "存在", "absence": "缺失", "babe": "宝贝",
  "dude": "老兄", "feel the shock of": "感到……的震撼", "to check nearby": "查看附近", "look close by": "就近查看", "Something": "某物",
  " at a spot near you": "在你附近的某处", " at your displaced image": "在你的错位影像上", " at you": "在你身上",
  "becomes transparent": "变得透明", "struggle to keep your balance.": "努力保持平衡。", "reel...": "踉跄……", "snakes": "蛇",
  "shakes": "颤动", "waves": "波动", "something squirmy": "某种蠕动的东西", "odd": "古怪", "cold": "寒冷", "warm": "温暖", "hot": "灼热",
  "can't cast that spell": "无法施放那个法术", "don't know that spell": "不会那个法术", "are not able to teleport at will": "无法随意传送",
  "for a teleport spell": "用于传送法术", "to teleport": "以传送", "writhe": "扭动", "scream": "尖叫",
  ", and you gather up all your possessions": "，你收拾起自己所有的财物", "weapon ": "武器", "spell casting ": "施法", "fighting ": "格斗",
  "silver ": "银", "sear": "灼烧", " out": "出来", "most": "大部分", "vaporizes part of": "蒸发了部分", "freezes": "冻结",
  "!  Lightning strikes": "！  闪电击中", "!  A hail of magic missiles strikes": "！  一阵魔法飞弹击中", "unholy blade": "邪恶之刃",
  "object": "物品", " anymore": "了", "increased by": "增加了", "set to": "设为", "now": "现在", "eating": "进食", "Her": "她的",
  "His": "他的", ", or vice versa!": "，反之亦然！", "seems unable": "似乎无法", "is no longer tame": "不再驯服", "has become feral": "变得凶野",
  "immobile": "无法动弹", "flows": "流动", "oozes": "渗出", "now detect": "现在能探测到", "observe": "观察到", "portcullis": "闸门",
  "disappear": "消失", "coming": "到来", "going": "离去", "someone counting money.": "有人在数钱。", "the quarterback calling the play.": "四分卫在喊战术。",
  "(nonexistent) ": "（不存在的）", "stand": "站立", "Ma'am": "女士", "stupefied": "呆滞", "blind": "失明", "wails in agony": "痛苦地哀嚎",
  "cries out in pain": "痛苦地叫喊", "carry all that and also ": "拿着那一切，还要", "left": "左", "right": "右", "they": "它们", "sad": "悲伤",
  "sense that": "感觉到", "has ": "有", "Splat!  ": "啪嗒！  ", "Its flesh": "它的血肉", "angry snakes!": "愤怒的蛇！",
  "a hissing noise.": "一阵嘶嘶声。", " to nowhere": "，去往虚无", "magic ": "魔法", "A grave": "一座坟墓", "Can't place a grave here": "无法在此放置坟墓",
  "A nearby voice": "附近的一个声音", "n enormous": "一个巨大的", "one bit": "一点", "two bits": "一丁点", "someone bowling.": "有人在打保龄球。",
  "rumbling in the distance.": "远处的隆隆声。", "es": "", "Even now thy life force ebbs, %s!": "此刻你的生命力正在消退，%s！",
  "Savor thy breath, %s, it be thy last!": "珍惜你的呼吸吧，%s，这是你最后一次了！", "I shall return.": "我会回来的。", "I'll be back.": "我会回来的。",
  "choke": "窒息", "body rises from the dead": "尸体从死亡中复活", "revenant persists": "亡魂徘徊不去", "brighter": "更亮",
  "less brightly": "不那么明亮", " inside your pack": "在你的背包里", "both have a value and ": "都有价值，并且", "rogue level": "盗贼层",
  "primary": "主要", "offhandedly ": "漫不经心地", "casually ": "随意地", "nonchalantly ": "满不在乎地",
  "expires": "失效", "dies": "熄灭", "Sister": "姐妹", "Brother": "兄弟",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
