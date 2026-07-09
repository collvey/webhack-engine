#!/usr/bin/env node
/*
 * WebHack i18n — translate interactive prompt strings (getlin/yn/yn_function/
 * ynq), now _()-wrapped by wrap-prompts.mjs. Player-facing prompts only; wizard/
 * debug/bones prompts are left English. Keyed by exact source string. Idempotent.
 *
 * Usage: node scripts/i18n/add-prompts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'Are you sure you want to pray?': '你确定要祈祷吗？',
  'Are you sure you want to enter?': '你确定要进入吗？',
  'Beware, there will be no return!  Still climb?': '小心，将无法返回！仍要攀爬吗？',
  'Disarm it?': '解除它吗？',
  'Do you want to add to the current engraving?': '你想在当前刻字上继续添加吗？',
  'Do you want to see the dungeon overview?': '你想查看地牢概览吗？',
  'Do you want to see your attributes?': '你想查看你的属性吗？',
  'Do you want to see your conduct?': '你想查看你的行为准则吗？',
  'Do you wish to teleport?': '你希望传送吗？',
  'Drink from the fountain?': '从喷泉喝水吗？',
  'Drink from the sink?': '从水槽喝水吗？',
  'Drink the water around you?': '喝你周围的水吗？',
  'Dry up fountain?': '抽干喷泉吗？',
  'Eat it?': '吃掉它吗？',
  'Force the gods to be pleased?': '强迫众神满意吗？',
  'Force the mount to succeed?': '强行让坐骑成功吗？',
  'Heal your legs?': '治疗你的腿吗？',
  'How much will you offer?': '你要献上多少？',
  'Improvise?': '即兴发挥吗？',
  'Itemized billing?': '逐项列出账单吗？',
  'Jump in?': '跳进去吗？',
  'Kick your steed?': '踢你的坐骑吗？',
  'Override?': '要覆盖吗？',
  'Overwrite the old file?': '覆盖旧文件吗？',
  'Play the passtune?': '演奏通关曲调吗？',
  'Really save?': '确定要保存吗？',
  'What command?': '什么命令？',
  'What do you look for?': '你在寻找什么？',
  'What do you want to call this dungeon level?': '你想把这层地牢命名为什么？',
  'What tune are you playing? [5 notes, A-G]': '你在演奏什么曲调？[5个音符，A-G]',
  'You find a trap!  Do you want to try to disarm it?': '你发现一个陷阱！你想尝试解除它吗？',
  'adjust?': '调整吗？',
  'How much will you contribute?': '你要贡献多少？',
  'Specify what? (type the word)': '指定什么？（输入该词）',
  'What class of monsters do you wish to genocide?': '你希望灭绝哪一类怪物？',
  'What monster do you want to genocide? [type the name]': '你想灭绝哪种怪物？[输入名称]',
  'What new autopickup exception pattern?': '新的自动拾取例外模式？',
  'What new menucolor pattern?': '新的菜单颜色模式？',
  'What new message pattern?': '新的消息模式？',
  // End-of-game disclosure + mail conduct prompt (player-facing, not wizard/bones).
  'Do you want an account of creatures vanquished?': '你想查看已消灭生物的记录吗？',
  'Reading mail will violate \\"illiterate\\" conduct.  Read anyway?':
    '阅读邮件会违反“文盲”行为准则。仍要阅读吗？',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
