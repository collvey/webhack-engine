#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // extended-commands menu (headings[] + toggle options)
  'Extended commands': '扩展命令', 'Debugging Extended Commands': '调试扩展命令',
  'Show debugging commands in separate section': '在单独分区显示调试命令',
  'Show all alphabetically, including debugging commands': '按字母顺序显示全部（含调试命令）',
  // dokeylist command-key help (misc_keys[].desc, run_desc, forcefight_desc)
  'Prefix: run until something very interesting is seen': '前缀：奔跑直到看见非常有趣的东西',
  'Prefix: force fight even if you don\'t see a monster': '前缀：强制攻击（即使看不到怪物）',
  'escape from the current query/action': '退出当前查询/操作',
  'Prefix: rush until something interesting is seen': '前缀：疾行直到看见有趣的东西',
  'Prefix: move without picking up objects/fighting': '前缀：移动但不捡物/战斗',
  'Prefix: run without picking up objects/fighting': '前缀：奔跑但不捡物/战斗',
  'view inventory': '查看物品栏', 'Prefix: request a menu': '前缀：请求菜单',
  're-do: perform the previous command again': '重做：再次执行上一条命令',
  // count prompt
  'Count: ': '计数：', 'Count: %ld': '计数：%ld', 'Count: %ld ': '计数：%ld ',
  'the desired destination': '目标地点',
  // paranoid yes/no hints — keep yes/no keywords (typed input matched via strcmpi)
  '(yes|no)': '（yes|no）', '(yes) [no]': '（yes）[no]',
  '"Yes" or "No": ': '请输入 “Yes” 或 “No”：',
  // adverbs
  'all ': '全部', 'both ': '两者', 'rush': '疾行',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
