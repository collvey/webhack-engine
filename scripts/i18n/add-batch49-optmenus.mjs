#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // options.c msgtype_names[].descr — shown via add_menu(_(…descr))
  'Show message normally': '正常显示消息',
  'Hide message': '隐藏消息',
  'Prompt for more after the message': '消息后提示继续',
  'Do not repeat the message': '不重复该消息',
  // options.c action_titles[].desc (add/list/remove menu) — Sprintf(_(…desc))
  'add new %s': '新增%s',
  'list %s': '列出%s',
  'remove existing %s': '移除现有%s',
  'exit this menu': '退出此菜单',
  // handle_add_list_remove() optname nouns
  'message type': '消息类型',
  'autopickup exception': '自动拾取例外',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
