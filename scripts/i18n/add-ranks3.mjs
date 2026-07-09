#!/usr/bin/env node
/*
 * WebHack i18n — rank titles for the remaining roles (Archeologist, Caveman,
 * Knight, Monk, Priest, Rogue, Ranger, Samurai, Tourist). Real rank titles only
 * (god names / role codes / quest places from role.c are excluded). rank_of()
 * is _()-wrapped, so these translate at display. Idempotent.
 *
 * Usage: node scripts/i18n/add-ranks3.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  /* Archeologist */
  'Digger': '挖掘工', 'Field Worker': '田野工作者', 'Investigator': '调查员',
  'Exhumer': '掘墓者', 'Excavator': '发掘者', 'Spelunker': '洞穴探险者',
  'Speleologist': '洞穴学家', 'Collector': '收藏家', 'Curator': '馆长',
  /* Caveman */
  'Troglodyte': '穴居野人', 'Aborigine': '原住民', 'Wanderer': '流浪者',
  'Vagrant': '漂泊者', 'Wayfarer': '旅人', 'Roamer': '漫游者', 'Nomad': '游牧者',
  'Rover': '漫游客', 'Pioneer': '拓荒者',
  /* Knight */
  'Gallant': '侍从骑士', 'Esquire': '乡绅', 'Bachelor': '见习骑士', 'Sergeant': '军士',
  'Banneret': '旗骑士', 'Chevalier': '骑士', 'Chevaliere': '女骑士',
  'Seignieur': '领主骑士', 'Dame': '女爵', 'Paladin': '圣骑士',
  /* Monk */
  'Candidate': '候选者', 'Novice': '新学', 'Initiate': '入门者',
  'Student of Stones': '石之学徒', 'Student of Waters': '水之学徒',
  'Student of Metals': '金之学徒', 'Student of Winds': '风之学徒',
  'Student of Fire': '火之学徒', 'Master': '宗师',
  /* Priest */
  'Aspirant': '志愿者', 'Acolyte': '侍僧', 'Adept': '熟练者', 'Curate': '助理牧师',
  'Canon': '议事司铎', 'Canoness': '女议事司铎', 'Lama': '喇嘛', 'Patriarch': '大主教',
  'Matriarch': '女大主教', 'High Priest': '大祭司', 'High Priestess': '女大祭司',
  /* Rogue */
  'Footpad': '拦路贼', 'Cutpurse': '扒手', 'Pilferer': '小偷', 'Robber': '劫匪',
  'Burglar': '窃贼', 'Filcher': '顺手牵羊者', 'Magsman': '骗徒', 'Magswoman': '女骗徒',
  'Thief': '盗贼',
  /* Ranger */
  'Tenderfoot': '新手', 'Lookout': '哨兵', 'Trailblazer': '开路者',
  'Reconnoiterer': '侦察者', 'Reconnoiteress': '女侦察者', 'Scout': '斥候',
  'Arbalester': '弩手', 'Archer': '弓箭手', 'Sharpshooter': '神射手',
  'Marksman': '射手', 'Markswoman': '女射手',
  /* Samurai */
  'Hatamoto': '旗本', 'Ronin': '浪人', 'Ninja': '忍者', 'Kunoichi': '女忍者',
  'Joshu': '城主', 'Ryoshu': '领主', 'Kokushu': '国主', 'Daimyo': '大名',
  'Kuge': '公卿', 'Shogun': '将军',
  /* Tourist */
  'Rambler': '漫步者', 'Sightseer': '观光客', 'Excursionist': '远足者',
  'Peregrinator': '游历者', 'Peregrinatrix': '女游历者', 'Traveler': '旅行者',
  'Journeyer': '行者', 'Voyager': '航行者', 'Explorer': '探索者', 'Adventurer': '冒险家',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
