#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  "vomit": "呕吐", "hurl chunks": "吐了一地", "over": "在……上方", "in": "在……中", "green slime": "绿色黏液",
  "becomes less dense": "变得稀薄", " a bit": "一点", "are no longer invisible.": "不再隐形了。",
  "can no longer see through yourself.": "再也看不穿自己了。", "unusual": "不寻常的", "Their": "它们的", "Its": "它的",
  "mommy": "妈咪", "daddy": "爹地", "elbow": "手肘", "on a banana peel": "踩到香蕉皮", "and nearly fall": "，差点摔倒",
  "a candelabrum's ": "一座烛台的", "s die": "熄灭", " dies": "熄灭", "They shriek!": "它们尖叫起来！", "It shrieks!": "它尖叫起来！",
  "Their flames die.": "它们的火焰熄灭了。", "Its flame dies.": "它的火焰熄灭了。", "attempted acquisition": "试图取得",
  "touch": "触碰", "one": "一个", "another": "另一个", "more": "更多", " (except gold)": "（黄金除外）", "raise": "举起",
  "pick": "挑选", "can barely": "几乎不能", "can't even": "甚至无法", "Hmmm, it turns out to be": "唔，结果是",
  "carefully ": "小心地", "else ": "其他", "refrigerate": "冷藏", "notice": "注意到", "housecat": "家猫", " else": "其他",
  "spill": "洒出", "A monster appears.": "一只怪物出现了。", "Monsters appear!": "怪物出现了！", "Objects spill": "物品洒了出来",
  "An object spills": "一件物品洒了出来", "shoot": "射击", "throw": "投掷", "firing": "射击", "throwing": "投掷", "shot": "射出",
  "toss": "抛出", "and all your belongings ": "以及你所有的财物", "pool": "水潭", "buried ball": "埋着的铁球", "hurtle": "飞速冲",
  "%s lands %s your %s.": "%s落在你的%s%s。", "%s back to you, landing %s your %s.": "%s飞回你身边，落在你的%s%s。",
  "%s your %s!": "%s你的%s！", "%s back toward you, hitting your %s!": "%s朝你飞回来，击中了你的%s！", "tosses": "抛出",
  "entrails": "内脏", "currents": "气流", "The picture-painting demon": "画画的恶魔", "%s in the %s's entrails.": "%s在%s的内脏里。",
  "%s into %s.": "%s进入%s。", "The money disappears": "钱消失了", " no longer": "不再", " a bit more": "更多一点",
  "no longer see through yourself": "不再能看穿自己", " see through": "看穿", "not see": "看不见", "see through yourself": "看穿自己",
  "no longer see yourself": "不再能看见自己", "like sitting in a corner": "像坐在角落里", "giddy": "眩晕", " completely": "完全",
  "dragon scales are": "龙鳞是", "dragon scale mail is": "龙鳞甲是", "some lenses": "一副镜片", "a blindfold": "一副眼罩",
  "rings slip": "戒指滑落", "ring slips": "戒指滑落", "also ": "也", "other ": "其他", "creates a": "创造出一座",
  "extends the": "延伸了", "drawbridge": "吊桥", "bounce": "弹跳", "adjacent ": "相邻的", "Dude!  The living dead!": "老兄！  活死人！",
  "The grave's owner is very upset!": "坟墓的主人非常不满！", "I want my mummy!": "我要我的木乃伊（妈咪）！",
  "You've disturbed a tomb!": "你惊扰了一座坟墓！", "become": "变成", "statue": "雕像", " The axe-handle vibrates violently!": " 斧柄剧烈地震动！",
  " the lava": "熔岩", "wielded ": "手持的", "rot": "腐烂", "try to tunnel": "试图挖掘", "ooze": "渗流", "phase": "穿过",
  "something hidden": "某个隐藏的东西", "Drop the rest and follow me.": "把其余的放下，跟我来。",
  "You still have hidden gold.  Drop it now.": "你还藏着金子。  现在放下。", "I'll take care of that; please move along.": "那个交给我处理；请往前走。",
  "I'll take that; now get moving.": "那个我拿走了；快走吧。", "tizzy": "慌乱", "do": "做", "come": "来",
  "Your kick uncovers": "你的一脚踢开了", "You kick open": "你踢开了", "the altar": "祭坛", "the fountain": "喷泉",
  "The dish washer": "洗碗工", "Flupp! ": "噗！ ", "Muddy waste pops up from the drain": "泥污从排水口涌出",
  "You hear a sloshing sound": "你听到哗啦的声音", "Something splashes you in the": "有东西溅到了你的", "All the": "所有",
  "objects falls": "物品落下", " much": "很多", " besides you": "在你身旁", "turns to flesh and ": "变回血肉并", "cat": "猫",
  "The wand shoots an apparently harmless beam at you.": "魔杖向你射出一道看似无害的光束。", "You seem no deader than before.": "你似乎并没有比之前更死。",
  "even more ": "更加", "boil": "沸腾", "floor runs like butter!": "地板像黄油一样流淌！", "edges on the floor get smoother.": "地板的边缘变得平滑了。",
  "skip": "掠过", "blast": "冲击", "ray": "光线", "see a puff": "看到一缕", "smell a whiff": "闻到一丝", "Some of ": "一些",
  "One of ": "其中一个", "distant": "遥远的", "you": "你", "dives": "俯冲", "falls": "落下", "jump": "跳", "scales": "鳞片",
  "medallion": "奖章", "luster": "光泽", "drinking": "喝下", "chewing": "咀嚼", "into ooze": "成渗流", "move": "移动",
  "onto": "到……上", "between": "之间", "She": "她", "let her take": "让她拿走", "hand over": "交出", "continue removing": "继续脱下",
  "start removing": "开始脱下", "beautiful": "美丽的", "helps you to take": "帮你脱下", "you take": "你脱下",
  "you continue taking": "你继续脱下", "you start taking": "你开始脱下", " removed your chain and": "解开你的锁链并",
  "vanishes": "消失", "seems to vanish": "似乎消失了", "bottom of the pit": "坑底", "melted": "熔化的", "burned": "烧焦的",
  "feel the words": "感受到那些字", "all frosty": "结满霜", "too dirty": "太脏了", "frosty": "结霜的",
  "glows violently, then ": "剧烈地发光，然后", "written in the dust": "写在尘土里", "scrawled in blood": "用血潦草写下",
  "written": "书写", "melted into": "熔刻入", "burned into": "烧刻入", "engraved in": "刻在", "One of y": "你其中一",
  "hold the": "握住", "reach the": "够到", "lock": "锁", "lock or ": "锁或", "when not wielding a": "未手持",
  "without a proper": "没有合适的", "with that": "用那个", "broken": "破损的", "unlocked": "已解锁", "Feels": "感觉",
  "Seems": "似乎", " tail": "尾巴", "Some creature": "某个生物", "hear": "听到", ", and now seems quieter": "，现在似乎安静了些",
  " below you": "在你下方", "piped": "尖细的", "soft": "柔和的", "trill": "颤音", "toot": "嘟嘟声",
  "produces a lilting melody": "奏出一段轻快的旋律", "twangs": "拨响", "butcher": "屠宰", "manage": "设法", "pull off": "完成",
  "extract a strange sound from %s!": "从%s中发出一种奇怪的声音！", "can feel %s emitting vibrations.": "能感到%s在发出震动。", "sword": "剑",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
