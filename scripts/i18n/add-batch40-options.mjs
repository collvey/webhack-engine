#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  'Status highlighting not supported for %s interface.': '%s 界面不支持状态高亮。',
  'Pick a color': '选择颜色', 'Pick an attribute': '选择属性',
  'How to show the message': '如何显示消息',
  'MSGTYPE regex error': 'MSGTYPE 正则错误', 'Regex error': '正则错误',
  'Menucolor regex error': 'Menucolor 正则错误',
  'Autopickup what?': '自动拾取什么？',
  '(%d currently set)': '（当前已设置 %d 项）',
  'autopickup exceptions': '自动拾取例外', 'menu colors': '菜单颜色',
  'message types': '消息类型', 'status hilite rules': '状态高亮规则',
  'Set what options?': '设置哪些选项？',
  'add new %s': '新增%s', 'list %s': '列出%s', 'remove existing %s': '移除现有%s',
  'exit this menu': '退出此菜单',
  'Do what?': '做什么？',
  'Select menustyle:': '选择菜单样式：',
  'Select encumbrance level:': '选择负重等级：',
  'Change which disclosure options categories:': '更改哪些披露选项类别：',
  'Select run/travel display mode:': '选择奔跑/旅行显示模式：',
  'Select coordinate display when auto-describing a map position:': '选择自动描述地图位置时的坐标显示：',
  'Select location filtering when going for next/previous map position:': '选择前往下一个/上一个地图位置时的位置筛选：',
  'Select message history display type:': '选择消息历史显示类型：',
  'Select loot sorting type:': '选择拾取排序类型：',
  'Select number_pad mode:': '选择 number_pad 模式：',
  'How to highlight menu headings:': '如何高亮菜单标题：',
  '(to be done)': '（待完成）',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
