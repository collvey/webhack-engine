#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // command-unavailable messages (unavailcmd[]/cmdnotavail[], used via _())
  "Unavailable command '%s'.": "命令 '%s' 不可用。",
  "'%s' command not available.": "'%s' 命令不可用。",
  'Do you want to enter explore mode?': '你想进入探索模式吗？',
  'Do you want to call panic() and end your game?': '你想调用 panic() 并结束游戏吗？',
  // here-command context menu (right-click "what do you want to do?")
  'Open the door': '开门',
  '%sunlock the door': '%s解锁门',
  'lock or ': '上锁或',
  'Search the door for a trap': '检查门是否有陷阱',
  'Kick the door': '踢门',
  'Close the door': '关门',
  'Search for secret doors': '搜索暗门',
  'Examine trap': '查看陷阱',
  'Attempt to disarm trap': '尝试拆除陷阱',
  'Ride %s': '骑乘%s',
  'Remove saddle from %s': '从%s身上取下鞍具',
  'Put saddle on %s': '给%s装上鞍具',
  'Drink from the %s': '从%s喝水',
  'Dip something into the fountain': '把东西浸入喷泉',
  'Sit on the throne': '坐上王座',
  'Go up the %s': '沿%s向上',
  'Go down the %s': '沿%s向下',
  'Dismount %s': '从%s上下来',
  'Pick up %s': '捡起%s',
  'Loot %s': '搜刮%s',
  'Eat %s': '吃%s',
  'Drop items': '丢下物品',
  'Rest one turn': '休息一回合',
  'Search around you': '搜索四周',
  'Look at what is here': '查看此处',
  'ladder': '梯子',
  'stairs': '楼梯',
  'items': '物品',
  // direction names (dirnames[] via directionname(); movtab[].txt/.alt)
  'west': '西', 'north': '北', 'east': '东', 'south': '南',
  'northwest': '西北', 'northeast': '东北', 'southwest': '西南', 'southeast': '东南',
  'up': '上', 'down': '下', 'left': '左', 'right': '右',
  'lower left': '左下', 'lower right': '右下', 'upper right': '右上', 'upper left': '左上',
  'invalid': '无效',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
