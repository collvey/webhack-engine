#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // ghostnames[] — real first names used for bones/ghost names (rndghostname)
  'Adri': '阿德里', 'Andries': '安德里斯', 'Andreas': '安德烈亚斯', 'Bert': '伯特',
  'David': '大卫', 'Dirk': '德克', 'Emile': '埃米尔', 'Frans': '弗兰斯', 'Fred': '弗雷德',
  'Greg': '格雷格', 'Hether': '赫瑟', 'Jay': '杰伊', 'John': '约翰', 'Jon': '乔恩',
  'Karnov': '卡尔诺夫', 'Kay': '凯', 'Kenny': '肯尼', 'Kevin': '凯文', 'Maud': '莫德',
  'Michiel': '米希尔', 'Mike': '迈克', 'Peter': '彼得', 'Robert': '罗伯特', 'Ron': '罗恩',
  'Tom': '汤姆', 'Wilmar': '威尔玛', 'Nick Danger': '尼克·丹杰', 'Phoenix': '菲尼克斯',
  'Jiro': '次郎', 'Mizue': '瑞江', 'Stephan': '斯蒂芬', 'Lance Braccus': '兰斯·布拉克斯',
  'Shadowhawk': '影鹰',
  // coynames[] — Wile E. Coyote mock-latin joke species (remaining)
  'Famishus-Famishus': '饿煞-饿煞', 'Eatibus Almost Anythingus': '几乎啥都吃食兽',
  'Eatius Birdius': '食鸟兽', 'Famishius Fantasticus': '奇幻饿兽',
  'Eternalii Famishiis': '永恒饥饿兽', 'Famishus Vulgarus': '俗饿兽',
  'Famishius Vulgaris Ingeniusi': '机巧俗饿兽', 'Eatius-Slobbius': '邋遢食兽',
  'Hardheadipus Oedipus': '硬头俄狄浦斯', 'Carnivorous Slobbius': '邋遢食肉兽',
  'Hard-Headipus Ravenus': '硬头贪食兽', 'Evereadii Eatibus': '随时能吃兽',
  // sir_Terry_novels[] — Discworld titles (remaining)
  'Mort': '莫特', 'Sourcery': '源术', 'Pyramids': '金字塔', 'Eric': '埃里克',
  'Maskerade': '假面舞会', 'Hogfather': '猪父节', 'Jingo': '战鼓', 'Thud!': '重击！',
  'Wintersmith': '冬之匠', 'Snuff': '鼻烟',
  // roguename() — Rogue authors
  'Michael Toy': '迈克尔·托伊', 'Kenneth Arnold': '肯尼斯·阿诺德', 'Glenn Wichman': '格伦·威奇曼',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
