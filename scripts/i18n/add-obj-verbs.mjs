#!/usr/bin/env node
/*
 * WebHack i18n — object-action verbs conjugated by otense()/vtense()/Tobjnam().
 * otense/vtense now return _(verb) in zh (no conjugation); this supplies the
 * base-verb translations so Tobjnam(obj,"verb") in already-translated formats
 * reads Chinese instead of leaking the English verb. Only clean single-verb
 * mappings are included; auxiliary/compound verbs (are/have/seem/go) are left to
 * English fallback (they need format-level handling, not a bare verb). Idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'assault': '冲击',
  'break': '破碎',
  'confuse': '迷惑',
  'crumble': '碎裂',
  'damage': '损伤',
  'evade': '躲开',
  'evaporate': '蒸发',
  'explode': '爆炸',
  'fall': '坠落',
  'flicker': '闪烁',
  'glow': '发光',
  'issue': '发出',
  'misfire': '哑火',
  'produce': '发出',
  'pulsate': '搏动',
  'radiate': '散发出',
  'resist': '抵抗',
  'return': '飞回',
  'shine': '闪耀',
  'slip': '滑落',
  'stop': '停下',
  'trigger': '触发',
  'vanish': '消失',
  'vibrate': '震动',
  'weld': '焊住',
  'whisper': '低语',
  'zap': '电击',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json) { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
