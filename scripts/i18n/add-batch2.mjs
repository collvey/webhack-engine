#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  "be chillin'.": "感觉很放松。", "feel a momentary chill.": "感到一阵寒意。", "totally together, man.": "整个人无比协调，老兄。",
  "very firm.": "非常结实。", "especially healthy.": "格外健康。", "healthy.": "健康。", "diffuse.": "松散。",
  "very jumpy.": "非常神经质。", "centered in your personal space.": "回到了自己的中心。", "in control of yourself.": "掌控着自己。",
  "in touch with the cosmos.": "与宇宙相通。", "a strange mental acuity.": "一种奇异的心智敏锐。", "an orange": "一个橙子",
  "a pile of gold": "一堆黄金", "Swee'pea": "斯威皮", "This ": "这个", "is": "是", "tastes": "尝起来",
  "gr-r-reat": "棒极啦", "gnarly": "带劲", "copacetic": "还不赖", "grody": "恶心", "delicious": "美味", "okay": "还行",
  "terrible": "糟糕", "Oh wow, like, superior, man": "哇噢，简直，太高级了，老兄", "This food really hits the spot": "这食物真是恰到好处",
  "Tastes great!  Less filling!": "味道好极了！  还不占肚子！", "Mmm, tripe... not bad!": "唔，牛肚……还不错！",
  "!#?&* elf kibble!": "!#?&* 精灵狗粮！", "primo": "顶级", "yummy": "好吃", "Segmentation fault": "段错误",
  "Bus error": "总线错误", "Yo' mama": "你老妈", "grody!": "恶心！", "terrible!": "糟透了！", "bland.": "平淡无味。",
  "gnarly!": "带劲！", "delicious!": "美味！", "feminine": "阴柔", "masculine": "阳刚",
  "Four out of five dentists agree.": "五分之四的牙医都赞同。", "That was pure chewing satisfaction!": "那是纯粹的咀嚼快感！",
  "the last bite of ": "最后一口", "eat": "吃", "begin eating": "开始吃", "now have a lesser case of the munchies.": "现在没那么嘴馋了。",
  "are getting the munchies.": "开始嘴馋了。", "only feel hungry now.": "现在只觉得饿。", "feel hungry.": "感到饥饿。",
  "are beginning to feel hungry.": "开始感到饥饿。", "You still have the munchies.": "你仍然嘴馋。",
  "The munchies are interfering with your motor capabilities.": "嘴馋正在影响你的行动能力。", "Elf": "精灵",
  "feel weak now.": "现在感到虚弱。", "feel weak.": "感到虚弱。", "are beginning to feel weak.": "开始感到虚弱。", "much ": "多",
  "softly glow": "柔和地发光", "fry to a crisp": "被烤得酥脆", "disintegrate into a pile of dust": "化为一堆尘土",
  "bummed": "沮丧", "displeased": "不悦", "hast strayed from the path": "已偏离正道", "art arrogant": "傲慢自大",
  "mortal": "凡人", "scorn": "蔑视", "call upon": "召唤", "appear": "现身", "beneath": "之下", "at": "于",
  "take lives": "夺人性命", "steal souls": "窃取灵魂", "pleased as punch": "乐不可支", "well-pleased": "十分满意",
  "ticklish": "痒痒的", "pleased": "满意", "full": "饱足", "satisfied": "满足", "Telepathy": "心灵感应",
  "Speed": "速度", "Stealth": "潜行", "my protection": "我的庇护", "Some of the": "一些", "One of the": "其中一个",
  "flash of light": "一道闪光", "burst of flame": "一阵火焰", "chaos": "混沌", "law": "秩序", "balance": "中立",
  "homesick": "思乡", "an urge to return to the surface": "一股返回地面的冲动", "ashamed": "羞愧", "dess": "女神",
  "boo-boo": "小差错", "mistake": "错误", "groovy": "妙极了", "slightly mollified": "略微息怒", "cosmic (not a new fact)": "宇宙级（并非新鲜事）",
  "mollified": "息怒", "see crabgrass at your %s.  A funny thing in a dungeon.": "在你的%s处看到马唐草。  地牢里的怪事。",
  "glimpse a four-leaf clover at your %s.": "在你的%s处瞥见一株四叶草。", "not able to call": "无法呼唤",
  "incapable of calling": "无力呼唤", "won't": "不会", "can't": "不能", "A voice (could it be": "一个声音（会是",
  "Despite your deafness, you seem to hear": "尽管你已失聪，你似乎仍听到", "?) whispers": "？）低语道", " say": "说道",
  "empty water": "空荡的水", "thin air": "稀薄的空气", "invisible ": "隐形的", "tries to pick you up": "试图把你抱起",
  "disturbs you": "打扰了你", "rushing noise": "呼啸声", "splat": "啪嗒", "slips off of": "从……滑落",
  "grabs you, but cannot hold onto": "抓住了你，但抓不牢", "greased": "涂了油的", "slippery": "滑溜的", "choked": "被噎住",
  "crushed": "被压碎", "says something but you can't hear it": "说了些什么，但你听不见", "brags about the goods some dungeon explorer provided": "吹嘘某位地牢探险者提供的货物",
  "makes some remarks about how difficult theft is lately": "谈论近来偷窃有多困难", "charm": "魅惑", "seduce": "勾引",
  "unaffected": "不受影响", "uninterested": "不感兴趣", "run": "奔跑", "snap": "啪地折断", " thoroughly": "彻底地",
  " utterly": "完全地", "are smoldering out!": "正在熄灭！", "find it mildly uncomfortable.": "觉得有点不舒服。",
  "feel comforted.": "感到宽慰。", "can barely breathe!": "几乎无法呼吸！", "regurgitates": "反刍吐出", "expels": "排出",
  "regurgitated": "反刍吐出", "expelled": "排出", "doesn't look all that ugly": "看起来没那么丑", "gazes ineffectually": "徒劳地凝视",
  "quite ": "相当", "a bit ": "有点", "somewhat ": "有些", "severe ": "严重", "seems to murmur into your ear": "似乎在你耳边低语",
  "murmurs sweet nothings into your ear": "在你耳边低语着甜言蜜语", "murmurs in your ear": "在你耳边低语",
  ", while helping you undress": "，一边帮你宽衣", "sweet lady": "甜心女士", "nice guy": "好小伙", "let's get a little closer": "咱们靠近一点吧",
  "it's in the way": "它碍事", "let me rub your feet": "让我给你揉揉脚", "they're too clumsy": "它们太碍手碍脚了",
  "let me massage you": "让我给你按摩", "give the fish a chance to fix their makeup.": "给鱼儿们一个补妆的机会。",
  "reflect the murky water.": "映出浑浊的水。", "have": "有", "die": "死亡", "It is": "它", "They are": "它们",
  " brightly!": "亮堂堂的！", "ignite": "点燃", "They go": "它们", "It goes": "它", "use": "使用", " lit": "点亮的",
  "candelabrum's ": "烛台的", "s are": "", " is": "", "go": "熄灭", "catch": "着火", "itself": "它自己", "themselves": "它们自己",
  "This is not a diving lamp": "这不是潜水灯", "Sorry, fire and water don't mix.": "抱歉，水火不容。",
  "  It gives off a dim light.": "  它发出微弱的光。", "see a puff of": "看到一缕", "smell": "闻到", "left ": "左", "right ": "右",
  "stuck in the floor": "卡在地板里", "attached to the buried ball": "拴在埋着的铁球上",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
