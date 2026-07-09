#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  "Perhaps that's why ": "也许这就是为什么", " into": "进", "plug": "堵住", "little": "小小的", "great": "极好的",
  "push aside": "推到一边", "could ": "本可以", "pick it up": "把它捡起来", "push it aside": "把它推到一边",
  "bars": "栏杆", "hard stone": "坚硬的岩石", "on a": "在", "a hole in the": "一个洞在", "boulder": "巨石",
  "rock": "岩石", "bar": "栏杆", "continue": "继续", "begin": "开始", "wobble unsteadily for a moment.": "摇晃了一下。",
  "gain control of your flight.": "掌控了你的飞行。", "a wall": "一堵墙", "a tree": "一棵树", "solid stone": "坚固的岩石",
  "lurches": "猛地一晃", "wrenches the ball": "猛拽铁球", "wriggle": "扭动", "wrench the ball": "猛拽铁球",
  "in place": "在原地", "to the ground": "到地上", "harmlessly ": "无害地", "futilely ": "徒劳地", "explode at": "在……处爆炸",
  "throbs palpably": "明显地跳动", "glows with a strange light": "发出奇异的光", "falling": "坠落", "feels": "感觉",
  "looks": "看起来", "humid": "潮湿", "muddy": "泥泞", " almost": "几乎", "abyss": "深渊",
  "%s, all your powers will be lost...": "%s，你所有的力量都将丧失……", "%s, your life force is running out.": "%s，你的生命力正在耗尽。",
  "the wailing of the Banshee...": "报丧女妖的哀嚎……", "the howling of the CwnAnnwn...": "库昂安农猎犬的嚎叫……",
  "misunderstand": "误解", "mispronounce": "念错", "counter": "抵消", "shimmering": "闪烁的", "layer": "一层",
  "violently ": "剧烈地", "while": "一会儿", "moment": "片刻", "suddenly vibrate": "突然震动", "again": "再次",
  "unexpectedly": "出乎意料地", "tingle": "刺痛", "glow ": "发光", "faint buzz": "微弱的嗡嗡声", " glow": "发光",
  " begin to glow": "开始发光", " even more": "更加", "even more": "更加", "very": "非常", "n even more": "更加",
  "sad wailing": "悲伤的哀嚎", "maniacal laughter": "疯狂的大笑", "close by": "在近处", "like someone is helping you.": "仿佛有人在帮你。",
  "like you need some help.": "仿佛你需要帮助。", "in touch with the Universal Oneness.": "与宇宙合一。",
  "the power of the Force against you!": "原力在与你作对！", "happens": "发生", "seems to happen": "似乎发生了", "seems": "似乎",
  "around": "四周", "above": "上方", "stinking ": "臭烘烘的", "symbol": "符号", "response": "回应", "the ": "",
  "do not": "没有", "no longer": "不再", "push": "推", "fills": "填满", "falls into": "掉进", " sizzling": "咝咝作响的",
  " with you": "与你", "triggers and ": "触发并", "plugs a trap door": "堵住了一扇陷阱门", "plugs a hole": "堵住了一个洞",
  "fills a pit": "填平了一个坑", "tumble": "翻滚", "flies": "飞", "weak": "虚弱", "strong": "强壮", "less": "较少",
  "small": "小", "momentarily ": "暂时", "oxygen molecules": "氧气分子", "the water": "水", "a bubble of air": "一个气泡",
  "being held": "被抓住", "stairs": "楼梯", "ladder": "梯子", "With great effort, you": "你费了很大力气，", "You": "你",
  " along": "沿着", "along the ladder": "沿着梯子", "the stairs": "楼梯", "climb down the ladder": "爬下梯子",
  "descend the stairs": "走下楼梯", "bite-covered": "布满咬痕的", "writhes": "扭动", "itch": "发痒", "brighten": "变亮",
  "sadder": "更悲伤", "twitch": "抽动", "dim": "变暗", "happier": "更快乐", "flatten": "变平", "can hear again.": "又能听见了。",
  "are unable to hear anything.": "什么也听不见。", "Far out, man!  You": "太赞了，老兄！  你", "Gee!  All of a sudden, you": "天哪！  突然间，你",
  "can see right through yourself": "能一眼看穿自己", "can't see yourself": "看不见自己", "peculiar": "古怪", "better": "更好",
  "good": "好", " a little": "一点", " a lot": "很多", " like acid": "像酸一样", "get": "变得", "shrieks": "尖叫",
  "could see right through yourself": "本能一眼看穿自己", "couldn't see yourself": "本看不见自己", "mix": "混合",
  "BOOM!  ": "轰！  ", "glows brightly and ": "明亮地发光并", ", then clears": "，随后变清澈", "gleam": "闪光",
  "corroded and rusty": "腐蚀生锈的", "rusty": "生锈的", "corroded": "腐蚀的", " that you dipped into": "你浸入的",
  "still constricts": "仍在收紧", "begins constricting": "开始收紧", "turn into": "变成", "feel like": "感觉像",
  "use your breath weapon": "使用你的吐息武器", "spit venom": "喷吐毒液", "remove an iron ball": "移除铁球",
  "gaze at monsters": "凝视怪物", "hide": "躲藏", "summon help": "召唤援助", "spin a web": "织网", "multiply in a fountain": "在喷泉中繁殖",
  "use your horn": "使用你的角", "emit a mental blast": "释放心灵冲击", "change shape": "变形", "sit": "坐下",
  "spawn in the water": "在水中产卵", "lay an egg": "下蛋", "pierce": "刺穿", " and weapon": "和武器", "slide": "滑动",
  "are pushed": "被推", "corpse": "尸体", "fail": "失败", "trapped": "被困住", "holding someone": "抓着某人",
  "holding that creature": "抓着那个生物", "telepathy": "心灵感应", "latent telepathy": "潜在的心灵感应", "mind": "心智",
  "tame": "驯服的", "wild": "野生的", "strike": "打击", "shatter": "碎裂", "petrifying": "石化的", "isn't": "不是",
  "aren't": "不是", " further": "进一步", "splash": "溅落", "pass": "穿过", "slip off of": "从……滑落",
  "grab, but cannot hold onto": "抓住，但抓不牢", "most of ": "大部分", " paper": "纸", " straw": "稻草",
  "regurgitate": "反刍吐出", "expel": "排出", "smile at": "对……微笑", "talk to": "对……说话", "throttled": "被扼住",
  " but doesn't seem concerned": "，但似乎并不在意", "rather ": "相当", "numb": "麻木",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
