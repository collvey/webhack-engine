#!/usr/bin/env node
/*
 * WebHack i18n — add contextual-action button labels to the frontend locale
 * bundles (locales/{en,zh-CN}/frontend.json) under a `contextualActions`
 * namespace, keyed by the exact English message from contextualActions.json
 * (both base `message` and `dynamicMessage.values`). Rendered via
 * t(`contextualActions.${msg}`) in ContextualActions.tsx. Idempotent.
 *
 * None of these strings contain '.' or ':', so react-i18next's default
 * key/ns separators are safe.
 *
 * Usage: node scripts/i18n/add-contextual-actions.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const zh = {
  'Eat something': '吃东西',
  'Fainting! - Eat now!': '即将昏厥！立刻进食！',
  'Weak from hunger - Eat something': '饿得虚弱 - 快吃东西',
  'Getting hungry - Eat something': '开始饿了 - 吃点东西',
  'Drop items': '丢弃物品',
  'Burdened - Drop items': '负重 - 丢弃物品',
  'Stressed - Drop items': '吃力 - 丢弃物品',
  'Strained - Drop items': '紧绷 - 丢弃物品',
  'Overtaxed! - Drop items': '超负荷！丢弃物品',
  'Overloaded! - Drop items': '严重超载！丢弃物品',
  'Low HP - Rest to heal': '生命值低 - 休息回血',
  'Go up stairs': '上楼梯',
  'Go down stairs': '下楼梯',
  'Pick up item': '拾取物品',
  'Loot container': '搜刮容器',
  'Drink from fountain': '饮用喷泉水',
  'Dip item in fountain': '将物品浸入喷泉',
  'Kick the door': '踢门',
  'Sit on throne': '坐上王座',
  'Talk to creature': '与生物交谈',
};

// Sanity: keys must not contain react-i18next separators.
for (const k of Object.keys(zh)) {
  if (k.includes('.') || k.includes(':')) {
    throw new Error(`Key contains a separator char, unsafe for t(): "${k}"`);
  }
}

const bundles = {
  en: Object.fromEntries(Object.keys(zh).map(k => [k, k])), // English == key
  'zh-CN': zh,
};

let total = 0;
for (const lang of ['en', 'zh-CN']) {
  const file = path.join(repoRoot, 'locales', lang, 'frontend.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.contextualActions = json.contextualActions || {};
  let added = 0;
  for (const [k, v] of Object.entries(bundles[lang])) {
    if (!(k in json.contextualActions)) { json.contextualActions[k] = v; added++; }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`${lang}: added ${added}`);
  total += added;
}
console.log(`Total: ${total}`);
