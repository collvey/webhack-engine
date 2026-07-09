import fs from 'node:fs';
const p = 'locales/zh-CN/webhack.translations.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const add = {
  // spell category (bug #2)
  "attack":"攻击","healing":"治疗","divination":"占卜","enchantment":"附魔","clerical":"神职","escape":"逃脱","matter":"物质",
  // statue/figurine (bug #1)
  "%s%s statue":"%s%s雕像","%s figurine":"%s小雕像","historic ":"历史的",
  // Goodbye() death farewells
  "Aloha":"阿罗哈","Fare thee well":"愿你安好","Sayonara":"莎哟娜拉","Farvel":"再会","Goodbye":"再见",
  // polyself special returns
  "paw":"爪","pawed":"用爪","rear paw":"后爪","trunk":"象鼻","cornea":"角膜","rayed":"用光线","beam":"光束","ray":"射线",
  // detect distances
  "far away":"在远处","far below":"在下方远处","away below you":"在你下方远处","below you":"在你下方","in the distance":"在远处","just below":"就在下方","far above":"在上方远处","away above you":"在你上方远处","above you":"在你上方","just above":"就在上方","near you":"在你附近",
  // dungeon branch types
  "Portal":"传送门","Connection":"连接","One way stair":"单向楼梯","Stair":"楼梯"," (unknown)":"（未知）","(unknown)":"（未知）",
  // objnam armor descr
  "dragon mail":"龙鳞甲","dragon scales":"龙鳞","jacket":"夹克","suit":"套装","robe":"长袍","wrapping":"裹布","cloak":"斗篷","gloves":"手套","whatcha-may-callit":"某种不知名之物",
  // body parts (humanoid_parts / animal / bird / horse / jelly / sphere / fungus / vortex / lizard / snake / worm / fish etc.)
  "arm":"臂","eye":"眼睛","face":"脸","fingertip":"指尖","foot":"脚","handed":"用手","leg":"腿","light headed":"头晕","neck":"脖子","spine":"脊柱","toe":"脚趾","hair":"头发","blood":"血液","lung":"肺","nose":"鼻子","stomach":"胃",
  "pseudopod":"伪足","dark spot":"暗斑","front":"前部","pseudopod extension":"伪足延伸部","pseudopod extremity":"伪足末端","pseudopod root":"伪足根部","grasp":"抓握部","grasped":"用抓握部","cerebral area":"脑区","lower pseudopod":"下伪足","viscous":"黏稠部","middle":"中部","surface":"表面","ripples":"涟漪","juices":"汁液","sensor":"感受器",
  "forelimb":"前肢","foreclaw":"前爪","claw tip":"爪尖","rear claw":"后爪","clawed":"用爪","rear limb":"后肢","rear claw tip":"后爪尖","fur":"毛皮",
  "wing":"翅膀","wing tip":"翅尖","winged":"振翅","feathers":"羽毛","bill":"喙",
  "foreleg":"前腿","forehoof":"前蹄","hoof tip":"蹄尖","rear hoof":"后蹄","hooved":"用蹄","rear leg":"后腿","backbone":"脊骨","rear hoof tip":"后蹄尖","mane":"鬃毛",
  "appendage":"附肢","optic nerve":"视神经","body":"身体","tentacle":"触手","tentacle tip":"触手尖","lower appendage":"下附肢","tentacled":"用触手","lower tentacle":"下触手","rotational":"旋转部","equator":"赤道部","lower tentacle tip":"下触手尖","cilia":"纤毛","life force":"生命力","retina":"视网膜","olfactory nerve":"嗅神经","interior":"内部",
  "mycelium":"菌丝体","visual area":"视觉区","hypha":"菌丝","root":"根部","strand":"菌索","stranded":"用菌索","cap area":"菌盖区","rhizome":"根状茎","sporulated":"用孢子","stalk":"菌柄","rhizome tip":"根状茎尖","spores":"孢子","gill":"菌褶","region":"区域",
  "minor current":"小气流","lower current":"下气流","swirl":"漩涡","swirled":"用漩涡","central core":"核心","addled":"混乱部","center":"中心","currents":"气流","edge":"边缘","leading edge":"前缘",
  "vestigial limb":"退化肢","large scale":"大鳞","large scale tip":"大鳞尖","rear region":"后部","scale gap":"鳞缝","scale gapped":"用鳞缝","length":"身长","rear scale":"后鳞","scales":"鳞片","forked tongue":"分叉的舌",
  "anterior segment":"前段","light sensitive cell":"感光细胞","clitellum":"环带","setae":"刚毛","posterior segment":"后段","segment":"体节","segmented":"用体节","posterior":"后部","over stretched":"过度伸展","posterior setae":"后刚毛","skin":"皮肤",
  "prostomium":"口前叶","fin":"鳍","premaxillary":"前颌","pelvic axillary":"腹腋","pelvic fin":"腹鳍","anal fin":"臀鳍","pectoral fin":"胸鳍","finned":"用鳍","peduncle":"尾柄","played out":"用尽","gills":"鳃","dorsal fin":"背鳍","caudal fin":"尾鳍","nostril":"鼻孔",
};
let n=0,d=0;
for(const[k,v] of Object.entries(add)){ if(k in j){d++;continue;} j[k]=v; n++; }
fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');
console.log('added',n,'skipped',d,'total',Object.keys(j).length);
