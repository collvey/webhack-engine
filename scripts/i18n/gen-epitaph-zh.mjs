// Generate locales/zh-CN/dat/epitaph.txt from the English dat/epitaph.txt.
// SELECTIVE policy: translate the plainly-generic tombstone one-liners via the
// DICT below; keep everything else verbatim (Latin, song lyrics, movie/TV
// quotes, proper nouns, and English-culture Easter eggs where the English IS
// the joke).  Comment (#) lines and blanks are copied through unchanged.
// Then repack with:  node scripts/i18n/gen-dlb-flavor.mjs epitaph locales/zh-CN/dat/epitaph.txt --write
import fs from 'node:fs';

const DICT = {
  "Rest in peace": "安息",
  "R.I.P.": "R.I.P.",
  "Note -- there are NO valuable items in this grave": "注意——此墓中并无任何值钱之物",
  "The Grave of the Unknown Hacker": "无名 Hacker 之墓",
  "We weren't sure who this was, but we buried him here anyway": "我们也不确定这是谁，但还是把他葬在了这里",
  "Sparky -- he was a very good dog": "斯帕基——他是条非常好的狗",
  "Beware of Electric Third Rail": "当心带电的第三轨",
  "Made in Taiwan": "台湾制造",
  "Look out below!": "下面的当心！",
  "Please don't dig me up.  I'm perfectly happy down here. -- Resident": "请别把我挖出来。我在下面待得可开心了。——住户",
  "Be careful, or this could happen to you!": "小心点，否则这也会落到你头上！",
  "Soon you'll join this fellow in hell! -- the Wizard of Yendor": "你不久就会下地狱来陪这家伙了！——雅顿魔法师",
  "Caution! This grave contains toxic waste": "警告！此墓内含有毒废料",
  "Here lies an Atheist, all dressed up and no place to go": "此处长眠着一位无神论者，盛装打扮却无处可去",
  "Here lies Ezekiel, age 102.  The good die young.": "此处长眠着以西结，享年 102 岁。好人不长命。",
  "I made an ash of myself": "我把自己烧成了一堆灰",
  "Soon ripe.  Soon rotten.  Soon gone.  But not forgotten.": "熟得快，烂得快，去得也快。但不会被遗忘。",
  "Go away!": "走开！",
  "At last... a nice long sleep.": "终于……可以美美地长眠了。",
  "Burninated": "被烧成焦炭",
  "Do not open until Christmas": "圣诞节前请勿开启",
  "Don't forget to stop and smell the roses": "别忘了停下脚步，闻一闻玫瑰花香",
  "Don't let this happen to you!": "别让这事落到你头上！",
  "Finally I am becoming stupider no more": "我终于不会再变笨了",
  "Follow me to hell": "跟我下地狱吧",
  "Game over, man.  Game over.": "游戏结束了，伙计。游戏结束了。",
  "Go away!  I'm trying to take a nap in here!  Bloody adventurers...": "走开！我正想在这儿打个盹呢！该死的冒险者……",
  "Gone fishin'": "钓鱼去了",
  "He farmed his way here": "他一路刷经验刷到了这里",
  "Here lies a programmer.  Killed by a fatal error.": "此处长眠着一名程序员。死于一个致命错误。",
  "Here lies Bob - decided to try an acid blob": "此处长眠着鲍勃——非要去招惹一只酸液怪",
  "Here lies Gregg, choked on an egg": "此处长眠着格雷格，被一个鸡蛋噎死",
  "He waited too long": "他等得太久了",
  "If a man's deeds do not outlive him, of what value is a mark in stone?": "倘若一个人的功业不能比他更长久，石上刻痕又有何价值？",
  "I'm gonna make it!": "我一定能挺过去！",
  "I will survive!": "我会活下去！",
  "Killed by a black dragon -- This grave is empty": "被黑龙所杀——此墓是空的",
  "Let me out of here!": "放我出去！",
  "One corpse, sans head": "一具尸体，缺一颗头",
  "Oops.": "哎呀。",
  "Out to Lunch": "外出午餐",
  "SOLD": "已售出",
  "Take my stuff, I don't need it anymore": "拿走我的东西吧，我再也用不上了",
  "The reports of my demise are completely accurate": "关于我的死讯，报道完全属实",
  "(This space for sale)": "（此处待售）",
  "This way to the crypt": "此路通往墓穴",
  "VACANCY": "空位招租",
  "Welcome!": "欢迎！",
  "Wish you were here!": "真希望你也在这儿！",
  "Yea, it got me too": "是啊，它也把我干掉了",
  "You should see the other guy": "你真该看看对方的下场",
  "...and they made me engrave my own headstone too!": "……他们还逼我自己给自己刻墓碑！",
  "A masochist is never satisfied.": "受虐狂永远不会满足。",
  "Adapt.  Enjoy.  Survive.": "适应。享受。生存。",
  "After three days, fish and guests stink": "鱼和客人过了三天都会发臭",
  "Age and treachery will always overcome youth and skill": "老谋深算总能胜过年轻力壮",
  "All else failed...": "其他一切都失败了……",
  "All hail RNG": "万岁，随机数之神",
  "All right, we'll call it a draw!": "好吧，就算平手！",
  "All's well that ends well": "结局好，一切都好",
  "Alone at last!": "终于清静了！",
  "Always attack a floating eye from behind!": "攻击浮空眼一定要从背后下手！",
  "Am I having fun yet?": "我这算是玩得开心吗？",
  "And I can still crawl, I'm not dead yet!": "我还能爬呢，我还没死！",
  "And all I wanted was a free lunch": "我想要的不过是一顿免费的午餐",
  "And everyone died.  Boo hoo hoo.": "然后大家都死了。呜呼呼。",
  "And so it ends?": "就这样结束了？",
  "And so... it begins.": "于是……一切开始了。",
  "And sometimes the bear eats you.": "而有时候，熊会把你吃掉。",
  "And they said it couldn't be done!": "他们还说这事办不成呢！",
  "Another lost soul": "又一个迷失的灵魂",
  "Any day above ground is a good day!": "只要还在地上，就是好日子！",
  "Anybody seen my head?": "有谁看见我的头了吗？",
  "Anyone for deathmatch?": "有谁想来场死亡竞赛吗？",
  "At least I'm good at something": "至少我还有一样拿手的",
  "Attempted suicide": "自杀未遂",
  "Be prepared": "有备无患",
  "Beauty survives": "美会长存",
  "Been Here.  Now Gone.  Had a Good Time.": "来过。已走。玩得尽兴。",
  "Being dead builds character": "死亡磨炼品格",
  "Beloved daughter, a treasure, buried here.": "挚爱的女儿，一件珍宝，长眠于此。",
  "Best friends come and go....  Mine just die.": "挚友来来去去……我的只是死了。",
  "Better luck next time": "下次好运",
  "Bloody Hell...": "该死的……",
  "Bloody barbarians!": "该死的野蛮人！",
  "Buried the cat.  Took an hour.  Damn thing kept fighting.": "埋了那只猫。花了一个钟头。这该死的东西一直在挣扎。",
  "But I disarmed the trap!": "可我明明拆掉了那个陷阱！",
  "Can YOU fly?": "你会飞吗？",
  "Can you believe that thing is STILL moving?": "你敢信那玩意儿居然还在动？",
  "Chaos, panic and disorder.  My work here is done.": "混乱、恐慌与失序。我在这儿的活儿干完了。",
  "Coffin for sale.  Lifetime guarantee.": "棺材出售。终身保修。",
  "Complain to one who can help you": "找个帮得上你的人去抱怨吧",
  "Could somebody get this noose off me?": "有谁能把这绞索给我解开吗？",
  "Cover me, I'm going in!": "掩护我，我要冲进去了！",
  "Curse god and die": "咒骂神明，然后死去",
  "Cut to fit": "量体裁衣",
  "Dead and loving every moment!": "死了，而且每一刻都乐在其中！",
  "Don't tread on me!": "别踩我！",
  "Dragon? What dragon?": "龙？什么龙？",
  "Either I'm dead or my watch has stopped.": "要么是我死了，要么是我的表停了。",
  "Enter not into the path of the wicked": "不要走恶人的道",
  "Every day is starting to look like Monday": "每天都开始越来越像星期一了",
  "Every survival kit should include a sense of humor": "每套生存装备都该配上一份幽默感",
  "Excuse me for not standing up.": "恕我不能起身相迎。",
  "Experience isn't everything.  First, you've got to survive.": "经验不是一切。首先，你得活下来。",
  "For sale: One soul, slightly used.  Asking for 3 wishes.": "出售：一枚灵魂，九成新。开价三个愿望。",
  "For some moments in life, there are no words.": "人生有些时刻，是无法言说的。",
  "Gone But Not Forgotten": "已逝，但未被遗忘",
  "Got a life.  Didn't know what to do with it.": "得了条命。却不知拿它怎么办。",
  "Have you come to raise the dead?": "你是来复活死者的吗？",
  "Having a good time can be deadly.": "玩得开心也可能是致命的。",
  "He died of the flux.": "他死于痢疾。",
  "He's not dead, he just smells that way.": "他没死，只是闻着像死了。",
  "Help! I've fallen and I can't get up!": "救命！我摔倒了，爬不起来了！",
  "Help, I can't wake up!": "救命，我醒不过来了！",
  "Hey, I didn't write this stuff!": "喂，这些字可不是我写的！",
  "Hold my calls": "帮我挡下所有电话",
  "Home Sweet Hell": "地狱甜蜜的地狱",
  "I TOLD you I was sick!": "我早跟你说过我病了！",
  "I am here.  Wish you were fine.": "我在这儿。愿你安好。",
};

// Merge the preliminary bulk translation of the remaining ~274 lines (Latin,
// quotes, puns rendered best-effort with parenthetical glosses; lines needing
// human polish are listed in locales/zh-CN/dat/epitaph-review.json). The inline
// DICT above still wins on any overlap.
const EXTRA_PATH = 'locales/zh-CN/dat/epitaph-extra.json';
if (fs.existsSync(EXTRA_PATH)) {
  const extra = JSON.parse(fs.readFileSync(EXTRA_PATH, 'utf8'));
  for (const [k, v] of Object.entries(extra)) if (!(k in DICT)) DICT[k] = v;
}

const src = fs.readFileSync('dat/epitaph.txt', 'utf8').split('\n');
let translated = 0, kept = 0;
const out = src.map((line) => {
  if (line.startsWith('#') || line.trim() === '') return line;
  if (line in DICT) { translated++; return DICT[line]; }
  kept++;
  return line; // reference/Latin/quote -> keep verbatim (by design)
});
fs.writeFileSync('locales/zh-CN/dat/epitaph.txt', out.join('\n'));
console.log(`epitaph: translated ${translated}, kept-verbatim ${kept} (references/Latin/quotes by design)`);
