#!/usr/bin/env node
/*
 * WebHack i18n — add status-bar hunger / encumbrance / condition labels to the
 * frontend locale bundles (locales/{en,zh-CN}/frontend.json), under the
 * existing `statusBars` namespace. These values were previously hardcoded
 * English in StatusBars.tsx. Idempotent: only fills missing keys.
 *
 * Usage: node scripts/i18n/add-statusbar-strings.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const data = {
  en: {
    hunger: { Fainting: 'Fainting', Weak: 'Weak', Hungry: 'Hungry', Satiated: 'Satiated' },
    encumbrance: {
      Burdened: 'Burdened', Stressed: 'Stressed', Strained: 'Strained',
      Overtaxed: 'Overtaxed', Overloaded: 'Overloaded',
    },
    conditions: {
      Stone: 'Stone', Slime: 'Slime', Strngl: 'Strngl', FoodPois: 'FoodPois',
      TermIll: 'TermIll', Blind: 'Blind', Deaf: 'Deaf', Stun: 'Stun',
      Conf: 'Conf', Hallu: 'Hallu', Lev: 'Lev', Fly: 'Fly', Ride: 'Ride',
    },
  },
  'zh-CN': {
    hunger: { Fainting: '濒临昏厥', Weak: '虚弱', Hungry: '饥饿', Satiated: '饱足' },
    encumbrance: {
      Burdened: '负重', Stressed: '吃力', Strained: '紧绷',
      Overtaxed: '超负荷', Overloaded: '严重超载',
    },
    conditions: {
      Stone: '石化', Slime: '黏液化', Strngl: '窒息', FoodPois: '食物中毒',
      TermIll: '绝症', Blind: '失明', Deaf: '失聪', Stun: '眩晕',
      Conf: '混乱', Hallu: '幻觉', Lev: '漂浮', Fly: '飞行', Ride: '骑乘',
    },
  },
};

let totalAdded = 0;
for (const lang of ['en', 'zh-CN']) {
  const file = path.join(repoRoot, 'locales', lang, 'frontend.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.statusBars = json.statusBars || {};
  let added = 0;
  for (const group of ['hunger', 'encumbrance', 'conditions']) {
    json.statusBars[group] = json.statusBars[group] || {};
    for (const [k, v] of Object.entries(data[lang][group])) {
      if (!(k in json.statusBars[group])) { json.statusBars[group][k] = v; added++; }
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`${lang}: added ${added} keys`);
  totalAdded += added;
}
console.log(`Total: ${totalAdded} keys across both bundles`);
