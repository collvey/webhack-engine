#!/usr/bin/env node
/*
 * WebHack i18n — translate player-facing yn/getlin/getobj prompts that were
 * built via Sprintf(qbuf, "...") and thus MISSED by the _()-literal wrap effort.
 * Batch 1: only prompts whose %-substitutions are already-localized (monster
 * names via mon_nam/x_monnam/distant_monnam), plain numbers, or menu-accelerator
 * letters — so no English leaks into the %s slots. The format strings are now
 * _()-wrapped at their Sprintf sites. Keyed by exact source form. Idempotent.
 *
 * (Deferred to later batches: prompts substituting English helper words like
 *  "first"/"next", "Unlock"/"Lock", "holding you"/"armed", raw mons[].mname,
 *  or the Dip_ prefix — those need their sub-parts localized first.)
 *
 * Usage: node scripts/i18n/add-sprintf-prompts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = path.join(repoRoot, 'locales', 'zh-CN', 'webhack.translations.json');

const add = {
  'Really attack %s?': '真的要攻击%s吗？',
  'Do you want to remove the saddle from %s?': '你想从%s身上取下马鞍吗？',
  'There is 1 gold piece here; eat it?': '这里有 1 枚金币；吃掉它吗？',
  'There are %ld gold pieces here; eat them?': '这里有 %ld 枚金币；吃掉它们吗？',
  'Cast which spell? [%s *?]': '施放哪个法术？[%s *?]',
  'What do you want to call %s?': '你想把%s叫做什么？',
  // Batch 2: number subst + verb-composed prompts (Chinese SVO keeps them clean).
  'Pick %d of what?': '挑选 %d 个哪种物品？',
  '%s it?': '对它%s吗？', // lock.c door: %s = Lock/Unlock
  'Lock': '上锁',
  'Unlock': '开锁',
  'Really %s %s?': '真的要%s%s吗？', // polyself gaze: %s1 = confuse/attack, %s2 = mon_nam ('attack' already in catalog)
  'confuse': '迷惑',
  // Batch 3: name-source-fixed + intentionally-English-subst prompts.
  'Become %s?': '变成%s吗？', // polyself.c:541 — now uses nhi18n_monname(mntmp) so %s is localized
  'Set %s to what?': '把 %s 设为什么？', // options.c:4690 — %s = compopt name, kept English by design
  // Batch 4: wield.c "Ready which weapon" prompts (num + simpleonames localized-obj-name + clauses).
  'You are wielding %ld %s.  Ready %ld of them?': '你正持握着 %ld 件%s。要改为装备其中 %ld 件吗？',
  'Ready all of them instead?': '要改为装备全部吗？',
  '%s %ld %s.  Ready %ld of them?': '%s %ld 件%s。要改为装备其中 %ld 件吗？', // %s1 = clause below
  'You are dual wielding': '你正双持',
  'Your alternate weapon is': '你的备用武器是',
  // Batch 5: loot verbs + letter/char prompts with localizable verb/suffix fragments.
  'Put in': '放入',
  'Take out': '取出',
  '%s what type of objects?': '%s哪类物品？', // pickup loot: %s = Put in/Take out
  '%s what?': '%s什么？',
  'Adjust letter to what [%s]%s?': '调整字母到哪个 [%s]%s？', // %s1 = letter list, %s2 = suffix below
  ' (? see used letters)': '（? 查看已用字母）',
  'Are you trying to use ^%c%s?': '你是想使用 ^%c%s 吗？', // %c = key, %s = suffix below
  ' as specified in the Guidebook': '（如指南所述）',
  // Batch 6: bear-trap eat + dig-direction (verb/state fragments; dig verb also localizes
  // the entangled-web pline which is already translated).
  'There is a bear trap here (%s); eat it?': '这里有个捕熊夹（%s）；吃掉它吗？',
  'holding you': '夹着你',
  'armed': '已布设',
  'In what direction do you want to %s? [%s]': '你想朝哪个方向%s？[%s]', // %s1 = dig/chop, %s2 = dir chars
  'dig': '挖掘',
  'chop': '劈砍',
  'Unfortunately,': '不幸的是，',
  'But': '但是',
  // Batch 7: write.c typeword class-noun localization (spellbook/scroll already in catalog).
  // Wrapping typeword at assignment also fixes 3 pre-existing mixed-output messages
  // (write.c:130/141/207) whose formats were already translated.
  'book': '书',
  'What type of %s do you want to write?': '你想写哪种%s？',
  // Batch 8: identify-which-item-first/next (pure-display fragments, no logic).
  'first': '先',
  'next': '接着',
  'What would you like to identify %s?': '你想%s鉴定哪一个？',
  // Batch 9: complete wield.c cluster (wield.c:434/472 stacked-weapon swap prompts).
  // Pure-display demonstrative/pronoun fragments (no logic; not wrapped elsewhere).
  'You are wielding %s.  Ready %s instead?': '你正持握着%s。要改为装备%s吗？',
  '%s your %s weapon.  Ready %s instead?': '%s你的%s武器。要改为装备%s吗？',
  'that': '那个',
  'those': '那些',
  'it': '它',
  'them': '它们',
  'That is': '那是',
  'Those are': '那些是',
  'second': '第二把',
  'alternate': '备用',
  // Batch 10: waterbody_name sub-system. SAFE approach — waterbody_name() stays English
  // (so trap.c:3879 strcmp(_,"water") drowning logic is intact); localize via _(runtime
  // string) gettext lookup at display sites (cmd/do/trap-killer/zap/potion). ice/water/drink
  // already in catalog. Also unlocks potion dip prompts (Dip_ static array replaced w/ _("Dip ")).
  'moat': '护城河',
  'pool of water': '水潭',
  'swamp': '沼泽',
  'lava': '熔岩',
  'deep water': '深水',
  ' in the %s': '于%s中',
  'Dip ': '把',
  '%s%s into the fountain?': '%s%s浸入喷泉吗？',
  '%s%s into the %s?': '%s%s浸入%s吗？',
  // Batch 11: currency() sub-system — money unit "zorkmid" localized at its DEFINITION
  // (invent.c:1290; no logic uses) auto-localizes ~54 wrapped-format callers. Also wrap the
  // few UNWRAPPED-format callers here to avoid mixed output. (shk.c:4230 Pay deferred — needs
  // cad() too; temporarily shows 佐克米 in an otherwise-English niche prompt.)
  'zorkmid': '佐克米',
  'You feel like a million %s!': '你感觉自己坐拥百万%s！',
  ' for %ld %s.  Pay?': '，售价 %ld %s。要付款吗？',
  ' each': '每件',
  '15 minutes could save you 15 %s.': '15 分钟就能帮你省下 15 %s。',
  // Batch 12: shopkeeper-anger sub-system — cad() gender insults + cost_per_charge usage-fee
  // messages (verbalize(fmt,...) with fmt a variable → wrapped each fmt='...' assignment) +
  // shk.c:4230 damage-Pay prompt (completes the currency batch's deferred item).
  'cad': '无赖',
  'minx': '泼妇',
  'beast': '畜生',
  'fiend': '恶鬼',
  'thing': '东西',
  '%sYou did %ld %s worth of damage!%s  Pay?': '%s你造成了价值 %ld %s 的损失！%s  要付款吗？',
  'This is no free library, %s!  ': '这里可不是免费图书馆，%s！  ',
  '%sYou owe%s %ld %s.': '%s你欠%s %ld %s。',
  ' an additional': '额外',
  'Whoa!  ': '哇！  ',
  'Watch it!  ': '当心点！  ',
  'Hey!  ': '嘿！  ',
  'Ahem.  ': '咳咳。  ',
  '%s%sThat will cost you %ld %s (Yendorian Fuel Tax).': '%s%s那将花费你 %ld %s（雅顿燃料税）。',
  '%s%sEmptying that will cost you %ld %s.': '%s%s清空那个将花费你 %ld %s。',
  '%s%sUsage fee, %ld %s.': '%s%s使用费，%ld %s。',
  // Batch 14: apply.c:2565 set-trap prompt. SHORTCUT — trap/terrain defsyms[].explanation names
  // are ALREADY in the catalog (used by farlook via _(defsyms[...].explanation) in pager.c), so
  // wrapping _(...) at these display sites localizes the name FOR FREE. Also wrapped detect.c:1637
  // (trap detect), do.c:357 (sink→trap), sit.c:133/136 (sit on sink/altar) — no new keys needed.
  'Continue your attempt to set %s?': '继续尝试布设%s吗？',
  // Batch 16: pickup.c:194 query_classes loot prompt. action verb is strcmp'd in query_classes
  // (logic) → kept English at source, localized via _(action) runtime lookup at the display site.
  'pick up': '拾取',
  'put in': '放入',
  'take out': '取出',
  // Batch 17: do_wear.c:1917 ring-hand prompt — SURGICAL (avoided the disproportionate mbodypart
  // sub-system). body_part(FINGER) is only in this Sprintf (no strcmp) → wrapped _(body_part(FINGER))
  // per-site (runtime gettext localizes JUST this prompt; the other 239 body_part callers untouched).
  'Which %s%s, Right or Left?': '选择哪只%s%s，右边还是左边？',
  'ring-': '戴戒指的',
  'finger': '手指',
};

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
let added = 0, dup = 0;
for (const [k, v] of Object.entries(add)) {
  if (k in json && json[k] !== '') { dup++; continue; }
  json[k] = v; added++;
}
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
console.log(`Added ${added}, skipped ${dup} existing. Total keys: ${Object.keys(json).length}`);
