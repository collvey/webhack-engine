#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');
const add = {
  // alteration_verbs[] — shop billing "You %s %s %s, you pay for %s!"
  'cancel': '取消', 'drain': '抽干', 'uncharge': '放电', 'unbless': '祛福',
  'uncurse': '解咒', 'disenchant': '褪魔', 'degrade': '降级', 'dilute': '稀释',
  'erase': '擦除', 'burn': '烧毁', 'neutralize': '中和', 'destroy': '摧毁',
  'splatter': '泼溅', 'bite': '咬', 'open': '打开', 'break the lock on': '撬开…的锁',
  'rust': '锈蚀', 'rot': '腐烂', 'tarnish': '使…失去光泽',
  // pronouns used in the same billing messages
  'it': '它', 'them': '它们',
  // horn of plenty spill (potion/food)
  'Some potions': '一些药水', 'A potion': '一瓶药水', 'Some food': '一些食物',
  '%s %s out.': '%s%s了出来。', 'spill': '洒落',
  'Oops!  %s out of your reach!': '哎呀！%s脱离了你的掌握！',
  'Oops!  %s away from you!': '哎呀！%s离你而去！',
  'Oops!  %s to the floor!': '哎呀！%s掉到了地上！',
  'slip': '滑落',
};
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let n = 0, d = 0;
for (const [k, v] of Object.entries(add)) { if (k in json) { d++; continue; } json[k] = v; n++; }
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`added ${n}, skipped ${d}, total ${Object.keys(json).length}`);
