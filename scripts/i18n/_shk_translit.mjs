import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const raw = JSON.parse(fs.readFileSync(path.join(repoRoot, 'scripts/i18n/_shknames_raw.json'), 'utf8'));

// ---- curated overrides (standard Chinese renderings) ----
const CURATED = {
  // Tibet health-food shop (real Tibetan places, already romanized)
  "Ga'er": '噶尔', 'Zhangmu': '樟木', 'Rikaze': '日喀则', 'Jiangji': '江吉',
  'Changdu': '昌都', 'Linzhi': '林芝', 'Shigatse': '日喀则', 'Gyantse': '江孜',
  'Ganden': '甘丹', 'Tsurphu': '楚布', 'Lhasa': '拉萨', 'Tsedong': '泽当',
  'Drepung': '哲蚌',
  // gender-unspecified personal names (=prefix): standard transliterations
  'Azura': '阿祖拉', 'Blaze': '布雷兹', 'Breanna': '布蕾安娜', 'Breezy': '布里兹',
  'Dharma': '达摩', 'Feather': '菲瑟', 'Jasmine': '茉莉', 'Luna': '露娜',
  'Melody': '梅洛迪', 'Moonjava': '月爪哇', 'Petal': '佩塔尔', 'Rhiannon': '莉安农',
  'Starla': '斯塔拉', 'Tranquilla': '特兰奎拉', 'Windsong': '风歌', 'Zennia': '泽尼娅',
  'Zoe': '佐伊', 'Zora': '佐拉',
  // named special shopkeepers
  'Izchak': '伊兹查克', 'Lucrezia': '卢克蕾齐娅', 'Dirk': '德克',
};

// ---- CV-syllable transliterator: each (initial-consonant, vowel) -> ONE char ----
// digraph initials normalized to a base class
const DIGRAPH = { sch:'sh', sh:'sh', ch:'ch', th:'t', tj:'j', dj:'j', zh:'zh',
  ph:'f', gh:'g', rh:'r', ck:'k', kh:'h', gn:'n', wy:'w', ll:'l' };
// per-initial vowel->char maps. key 'x' = fallback vowel char for that initial.
const CV = {
  b:{a:'巴',o:'博',e:'贝',i:'比',u:'布',x:'布'},
  p:{a:'帕',o:'珀',e:'佩',i:'皮',u:'普',x:'普'},
  m:{a:'马',o:'莫',e:'梅',i:'米',u:'穆',x:'姆'},
  f:{a:'法',o:'福',e:'费',i:'菲',u:'富',x:'夫'},
  d:{a:'达',o:'多',e:'德',i:'迪',u:'杜',x:'德'},
  t:{a:'塔',o:'托',e:'特',i:'蒂',u:'图',x:'特'},
  n:{a:'纳',o:'诺',e:'内',i:'尼',u:'努',x:'恩'},
  l:{a:'拉',o:'洛',e:'勒',i:'利',u:'卢',x:'尔'},
  g:{a:'加',o:'戈',e:'格',i:'吉',u:'古',x:'格'},
  k:{a:'卡',o:'科',e:'克',i:'基',u:'库',x:'克'},
  h:{a:'哈',o:'霍',e:'赫',i:'希',u:'胡',x:'赫'},
  j:{a:'贾',o:'约',e:'杰',i:'吉',u:'尤',x:'季'},
  q:{a:'恰',o:'乔',e:'切',i:'奇',u:'丘',x:'库'},
  ch:{a:'恰',o:'乔',e:'切',i:'奇',u:'丘',x:'奇'},
  x:{a:'沙',o:'肖',e:'谢',i:'西',u:'许',x:'克'},
  sh:{a:'沙',o:'绍',e:'谢',i:'希',u:'舒',x:'什'},
  r:{a:'拉',o:'罗',e:'雷',i:'里',u:'鲁',x:'尔'},
  z:{a:'扎',o:'佐',e:'泽',i:'齐',u:'祖',x:'兹'},
  zh:{a:'扎',o:'若',e:'热',i:'日',u:'茹',x:'日'},
  c:{a:'察',o:'措',e:'策',i:'齐',u:'楚',x:'茨'},
  s:{a:'萨',o:'索',e:'塞',i:'西',u:'苏',x:'斯'},
  w:{a:'瓦',o:'沃',e:'韦',i:'维',u:'伍',x:'沃'},
  v:{a:'瓦',o:'沃',e:'韦',i:'维',u:'武',x:'夫'},
  y:{a:'亚',o:'约',e:'耶',i:'伊',u:'尤',x:'伊'},
  '':{a:'阿',o:'奥',e:'埃',i:'伊',u:'乌',x:'厄'}, // vowel-initial syllable
};
// coda consonant (syllable-final) -> light appended char
const CODA = { n:'恩', m:'姆', r:'尔', s:'斯', k:'克', g:'格', l:'尔', z:'兹', t:'特', c:'克', f:'夫', p:'普', d:'德', v:'夫', b:'布', x:'克' };
const VOWELS = 'aeiouy';
function normVowel(s, i) { // return [vowelClass, length]
  const two = s.substr(i, 2);
  const map2 = { ai:'a', ay:'a', ei:'e', ey:'e', au:'o', aa:'a', ee:'i', oo:'u', ou:'u',
    oe:'u', ie:'e', ia:'a', io:'o', ua:'a', ue:'e', ui:'i', uo:'o', eu:'u', yy:'i' };
  if (map2[two]) return [map2[two], 2];
  const c = s[i];
  if ('aeiou'.includes(c)) return [c, 1];
  if (c === 'y') return ['i', 1];
  return [null, 0];
}
function translitWord(w) {
  const s = w.toLowerCase().replace(/[^a-z]/g, '');
  let out = '', i = 0;
  while (i < s.length) {
    // initial consonant cluster: take digraph if present, else single consonant
    let ini = '';
    let d3 = s.substr(i, 3), d2 = s.substr(i, 2);
    if (DIGRAPH[d3]) { ini = DIGRAPH[d3]; i += 3; }
    else if (DIGRAPH[d2]) { ini = DIGRAPH[d2]; i += 2; }
    else if (!VOWELS.includes(s[i]) && s[i]) {
      // single consonant (skip extra consonants in a cluster, they get folded)
      const cch = s[i]; i += 1;
      ini = CV[cch] ? cch : '';
      if (!CV[cch]) { out += (CODA[cch] || ''); continue; }
    }
    const table = CV[ini] || CV[''];
    const [vc, vlen] = normVowel(s, i);
    if (vc) { out += (table[vc] || table.x); i += vlen; }
    else { out += table.x; } // no vowel -> use fallback char for the consonant
    // coda: a trailing consonant not starting a new CV (followed by consonant/end)
    if (i < s.length && !VOWELS.includes(s[i])) {
      const cc = s[i], nn = s[i + 1];
      if ((nn === undefined || !VOWELS.includes(nn)) && CODA[cc] !== undefined && !DIGRAPH[s.substr(i,2)] && !DIGRAPH[s.substr(i,3)]) {
        out += CODA[cc]; i += 1;
      }
    }
  }
  return out || w;
}
function translit(name) {
  // keep spaces/hyphens as separators, translit each token
  return name.split(/([ \-])/).map(t => {
    if (t === ' ') return '·';
    if (t === '-') return '';
    if (!/[a-z]/i.test(t)) return '';
    return translitWord(t);
  }).join('');
}

// strip a leading gender-prefix (non-letter first char), mirroring shkname()
function stripped(name) {
  return /^[A-Za-z]/.test(name) ? name : name.slice(1);
}
// decode C-source escapes to the runtime string (e.g. \' -> ')
function decode(name) { return name.replace(/\\(.)/g, '$1'); }

const add = {};
for (const rawName of raw) {
  const runtimeKey = decode(stripped(rawName));   // what _(shknm) looks up
  const trackerKey = decode(rawName);             // what the tracker sees (with prefix)
  const base = CURATED[runtimeKey] !== undefined ? CURATED[runtimeKey] : translit(runtimeKey);
  add[runtimeKey] = base;
  if (trackerKey !== runtimeKey) add[trackerKey] = base;
}

// preview
const sample = Object.entries(add).slice(0, 30);
console.log('generated', Object.keys(add).length, 'entries; sample:');
for (const [k, v] of sample) console.log(' ', k, '->', v);

if (process.argv.includes('--write')) {
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let n = 0, d = 0;
  for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
  console.log(`\nWROTE: added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
} else {
  fs.writeFileSync(path.join(repoRoot, 'scripts/i18n/_shk_preview.json'), JSON.stringify(add, null, 2));
  console.log('\n(dry run — wrote _shk_preview.json; pass --write to apply)');
}
