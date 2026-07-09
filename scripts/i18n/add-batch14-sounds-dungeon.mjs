#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // sounds.c vampire / minion dialogue
  "Good %s to you Master%s": "祝您%s安好，主人%s",
  "evening": "晚上", "day": "白天",
  ".  Why do we not rest?": "。我们为何不休息呢？",
  "Child of the night, ": "黑夜之子，",
  "I can stand this craving no longer!": "我再也无法忍受这份渴求了！",
  "I beg you, help me satisfy this growing craving!": "我恳求您，帮我满足这日益增长的渴求！",
  "I find myself growing a little weary.": "我觉得自己有些倦了。",
  "Good feeding %s!": "进食愉快，%s！", "sister": "姐妹", "brother": "兄弟",
  "How nice to hear you, child of the night!": "能听到你的声音真好，黑夜之子！",
  "%s!  Your silver sheen does not frighten me!": "%s！你那银色的光泽吓不倒我！",
  "Fool": "蠢货", "Young Fool": "年轻的蠢货",
  "Ah, so you have a copy of /%s/.": "啊，原来你有一本《%s》。",
  "  I may have been misquoted there.": "  我在那本书里也许被误引了。",
  // dungeon.c #overview
  "%s: levels %d up to %d": "%s：第 %d 层向上至第 %d 层",
  "%s: levels %d to %d": "%s：第 %d 至 %d 层",
  "%sLevel %d:": "%s第 %d 层：",
  " <- You are here.": "  <- 你在此处。",
  " <- You left from here.": "  <- 你从此处离开。",
  " <- You were here.": "  <- 你曾在此处。",
  " to %s": "，献给%s",
  "%sOracle of Delphi.": "%s德尔斐神谕所。",
  "Solved": "已解开", "Unsolved": "未解开",
  "%sA very big room.": "%s一间非常大的房间。",
  "%sA primitive area.": "%s一片原始区域。",
  "%sHome%s.": "%s家园%s。", " (no way back...)": "（无路可返……）",
  "%sCompleted quest for %s.": "%s为%s完成了任务。",
  "%sGiven quest by %s.": "%s由%s交予的任务。",
  "%sFort Ludios.": "%s路迪奥斯堡。",
  "%sThe castle%s.": "%s城堡%s。",
  "%sValley of the Dead.": "%s亡者之谷。",
  "%sMoloch's Sanctum.": "%s摩洛的圣所。",
  "%sSummoned by %s.": "%s被%s召唤而来。",
  "%s%s to %s": "%s%s通往%s",
  ", level %d": "，第 %d 层",
  "Final resting place for": "长眠之地：",
  "%s%syou, %s%c": "%s%s你，%s%c",
  // #overview feature nouns + quantity words
  "shop": "商店", "altar": "祭坛", "temple": "神庙", "throne": "王座",
  "fountain": "喷泉", "sink": "水槽", "grave": "坟墓", "tree": "树",
  "some": "一些", "many": "许多", "(unknown)": "（未知）",
  // dungeon.c endgame level names
  "Astral Plane": "星界", "Water": "水", "Fire": "火", "Air": "气",
  "Earth": "土", "Plane of %s": "%s之界", "unknown plane #%d": "未知位面 #%d",
  // dungeon.c passtune / annotate
  "notes \"%s\"": "音符“%s”", "5-note tune": "五音符曲调",
  " (play %s to open or close drawbridge)": "（演奏%s以开合吊桥）",
  "Replace annotation \"%.30s%s\" with?": "将注释“%.30s%s”替换为？",
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
