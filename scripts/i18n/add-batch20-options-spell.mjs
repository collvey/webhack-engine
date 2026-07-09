#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // options.c menu control help
  "Menu control keys:": "菜单控制键：",
  "Selection:       On page   Full menu": "选择：       本页     整个菜单",
  "Select all": "全选", "Deselect all": "取消全选", "Invert all": "全部反选",
  "Text match": "文本匹配", "Search and toggle matching entries": "搜索并切换匹配的条目",
  "Navigation:": "导航：", "Go to     ": "跳转到     ",
  "Next page": "下一页", "Previous page": "上一页", "First page": "第一页", "Last page": "最后一页",
  "SPACE": "空格", "Next page, if any, otherwise RETURN": "下一页（若有），否则回车",
  "RETURN/ENTER": "回车/ENTER", "Finish menu with any selection(s) made": "完成菜单并保留所选项",
  "ESCAPE": "ESCAPE", "Cancel menu without selecting anything": "取消菜单，不选任何项",
  // category headers
  "Booleans (selecting will toggle value):": "布尔选项（选择将切换其值）：",
  "Compounds (selecting will prompt for new value):": "复合选项（选择将提示输入新值）：",
  "Other settings:": "其他设置：", "Variable playground locations:": "变量测试位置：",
  "Compound options:": "复合选项：",
  // disclosure
  "Never disclose, without prompting": "从不披露，且不提示",
  "Always disclose, without prompting": "总是披露，且不提示",
  "Always disclose, pick sort order from menu": "总是披露，从菜单选择排序方式",
  "Prompt, with default answer of \"No\"": "提示，默认回答为“否”",
  "Prompt, with default answer of \"Yes\"": "提示，默认回答为“是”",
  "Prompt, with default answer of \"Ask\" to request sort menu": "提示，默认回答为“询问”以请求排序菜单",
  "Disclosure options for %s:": "%s的披露选项：",
  // choices / values
  "no filtering": "不过滤", "in view only": "仅视野内", "in same area": "仅同一区域",
  "Default Symbols": "默认符号",
  "none (no coordinates displayed)": "无（不显示坐标）", "map <x,y>": "地图 <x,y>",
  "screen [row,column]": "屏幕 [行,列]",
  "Always pickup '<'; never pickup '>'": "总是拾取 '<'；从不拾取 '>'",
  "all classes of objects": "所有类别的物品",
  "List of": "以下列表：", "Remove which": "移除哪个",
  "ray": "射线", "prompts": "提示", "OFF": "关闭", "unknown": "未知",
  "0=off": "0=关", "1=on": "1=开", "2=auto": "2=自动",
  "0 (off: don't highlight status fields)": "0（关闭：不高亮状态字段）",
  ", active": "，已激活", ", with one exception": "，有一个例外", ", with some exceptions": "，有一些例外",
  "rogue level ": "盗贼层 ", "/own": "/自己",
  "compass": "罗盘", "full compass": "完整罗盘", "screen": "屏幕", "view": "视野", "area": "区域",
  "single": "单个", "combination": "组合", "full": "完整", "reversed": "反向",
  "cat": "猫", "dog": "狗", "horse": "马",
  "New %s: [%s am] (%s)": "新的%s：[%s 可用] (%s)",
  "%s message types": "%s消息类型", "%s menu colors": "%s菜单颜色",
  "%s autopickup exceptions": "%s自动拾取例外",
  "Select %s window placement relative to the map:": "选择%s窗口相对于地图的位置：",
  "Select %ssymbol set:": "选择%s符号集：",
  "ON, for %s objects%s": "开启，针对%s物品%s",
  "%d top/%d around%s": "顶部 %d/周围 %d%s",
  "Set options as OPTIONS=<options> in %s": "在 %s 中以 OPTIONS=<选项> 设置选项",
  "%ld (on: highlight status for %ld turns)": "%ld（开启：高亮状态 %ld 回合）",
  // spell.c
  "This spellbook is %sdifficult to comprehend.  Continue?": "这本魔法书%s难以理解。  是否继续？",
  "zapped %sself with a spell": "用法术击中了自己",
  "Reordering spells; swap '%c' with": "重新排列法术；将 '%c' 与……交换",
  "%-20s     Level %-12s Fail Retention": "%-20s     等级 %-12s 失败率 保持度",
  "    Name": "    名称", "Category": "类别",
  "[sort spells]": "[排序法术]", "(gone)": "（已消失）",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
