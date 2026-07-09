#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // lock.c door messages
  " is broken": "已经损坏",
  "way has no door": "是个空门框",
  " is already open": "已经开着",
  " is locked": "是锁着的",
  "This door%s.": "这扇门%s。",
  // cmd.c cmdassist / help_dir
  "To use that command, hold down the <Ctrl> key as a shift": "要使用该命令，请按住 <Ctrl> 键作为切换键",
  "and press the <%c> key.": "然后按 <%c> 键。",
  "Valid direction keys%s%s%s are:": "有效的方向键%s%s%s：",
  " to ": "以",
  " in your current form": "（以你当前的形态）",
  "          <  up": "          <  上",
  "          >  down": "          >  下",
  "       %4s  direct at yourself": "       %4s  指向自己",
  "(Suppress this message with !cmdassist in config file.)": "（在配置文件中用 !cmdassist 禁止此消息。）",
  "cmdassist: %s": "cmdassist：%s",
  "do that": "执行该操作",
  "move": "移动",
  "rush": "冲锋",
  "run": "奔跑",
  "fight": "战斗",
  " at": "向",
  "You can't %s%s yourself.": "你无法%s%s自己。",
  "You can't %s %s.": "你无法%s%s。",
  "upward": "向上",
  "downward": "向下",
  "Invalid direction for '%s' prefix.": "'%s' 前缀的方向无效。",
  "Invalid direction key!": "无效的方向键！",
  // objnam.c naming suffixes
  " labeled ": "，标记为 ",
  " (alternate weapon; not wielded)": "（备用武器；未手持）",
  " (wielded in other %s)": "（用另一只%s手持）",
  " (in quiver)": "（在箭袋中）",
  " (in quiver pouch)": "（在箭囊中）",
  " (at the ready)": "（已备妥）",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
