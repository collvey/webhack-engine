/*
 * FULL LITERAL SURFACE auditor.
 *
 * Unlike coverage-core.mjs (which only sees literals in a curated set of code
 * SHAPES), this walks EVERY compiled file and reports EVERY double-quoted string
 * literal, so nothing is hidden. Each literal gets one of four labels:
 *
 *   translated      — wrapped in _() AND its text has a zh catalog entry (renders zh)
 *   untranslated    — high-confidence DISPLAYED but English: either a direct
 *                     message-emitter/menu literal that isn't wrapped, OR a
 *                     wrapped literal with no catalog entry yet
 *   excluded        — matched a non-display rule (shown WITH the reason)
 *   unclassified    — has letters, not excluded, but I CANNOT prove it is
 *                     displayed (buffer-builder / return / static array /
 *                     assignment / arbitrary-fn arg). The honest "I don't know".
 *
 * HONEST LIMITATIONS (do not claim this is exhaustive):
 *  - "displayed vs internal" is a data-flow question; a text scanner cannot
 *    resolve it, hence the 'unclassified' bucket exists on purpose.
 *  - context detection is heuristic (nearest preceding token).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// direct/high-confidence player-message emitters + menu
const EMIT = new Set(['pline', 'Norep', 'You', 'Your', 'You_feel', 'You_cant',
  'pline_The', 'There', 'You_hear', 'You_see', 'verbalize', 'custompline',
  'urgent_pline', 'pline1', 'Norep', 'You1', 'Your1', 'pline_dir', 'putstr',
  'add_menu', 'putmsghistory', 'raw_print', 'raw_print_bold', 'yn_function',
  'yn', 'ynq', 'ynaq', 'getlin', 'you_are', 'you_can', 'you_have', 'you_have_X',
  'you_have_been', 'you_have_never', 'enl_msg', 'enlght_out']);
// display functions that INTERNALLY _()-wrap their string args (so a bare literal
// argument IS translated at runtime — credited when the catalog has it). The
// enlightenment family routes every literal through enlght_line(), which does
// `_(start) _(middle) _(end)`.
const SELF_WRAP = new Set(['you_are', 'you_can', 'you_have', 'you_have_X',
  'you_have_been', 'you_have_never', 'enl_msg', 'enlght_line',
  // do_wear.c: already_wearing(cc) -> You(_("...%s..."), _(cc)); already_wearing2
  // (cc1,cc2) -> You_cant(_("...%s...%s..."), _(cc1), _(cc2)). Both wrap args.
  'already_wearing', 'already_wearing2',
  // pray.c: at_your_feet(str) -> str = _(str); then pline(_("%s ..."), str, ...)
  'at_your_feet',
  // set_occupation(fn, txt, xtime): txt stored in occtxt, shown via You(_("stop
  // %s."), _(occtxt)) in allmain.c — literal txt args translate at that display.
  'set_occupation',
  // check_capacity(str): shown via pline1(_(str)) in hack.c when over-encumbered.
  'check_capacity',
  // dospellmenu(prompt, …): prompt shown via end_menu(tmpwin, _(prompt)) in spell.c.
  'dospellmenu',
  // polyman(fmt, arg): revert-to-human messages shown via You(_(fmt), arg) in polyself.c.
  'polyman',
  // schedule_goto(tolev, …, pre_msg, post_msg): deferred level-change messages shown
  // via pline1(_(dfr_pre_msg))/pline1(_(dfr_post_msg)) in do.c.
  'schedule_goto',
  // shk_names_obj(shkp, obj, fmt, amt, arg): fmt shown via You(_(fmt), …) /
  // Sprintf(_("%%s; you %s"), _(fmt)) — the billing/trade format-string args.
  'shk_names_obj',
  // strange_feeling(obj, txt): txt shown via pline1(_(txt)) in potion.c.
  'strange_feeling',
  // prinv(prefix, obj, quan): prefix shown via pline(_("%s%s%s"), _(prefix), …).
  'prinv',
  // x_monnam(mtmp, article, adjective, …): the adjective ("poor"/"falling"/"angry") is
  // shown via Strcat(buf, _(adjective)) in do_name.c (with the trailing space gated off
  // for zh). Only string arg is the adjective; catalog credits it.
  'x_monnam',
  // hold_another_object(obj, drop_fmt, drop_arg, hold_msg): drop_fmt shown via
  // pline(_(drop_fmt), drop_arg) in invent.c. Only clean noun-%s call sites are
  // catalogued; verb-assembly ones (aobjnam %s) stay untranslated by design.
  'hold_another_object',
  // getobj(let, word): the action verb `word` is strcmp-matched raw for branching but
  // shown via Sprintf(qbuf, _("What do you want to %s?"), _(word)) and You(_("don't have
  // anything %sto %s."), …, _(word)) — display-vs-parse split already in the C. The verbs
  // are a genuine display surface (were wrongly cmpLits-excluded); catalog credits them.
  'getobj']);
const DEV = new Set(['impossible', 'panic', 'warning', 'debugpline', 'config_error_add',
  // raw_print/raw_printf bypass the window system — used only for panic/crash
  // reporting, CLI usage text, and windowport-init errors, never in-game player
  // messages (those go through pline/putstr). Verified: 0 are translated.
  'raw_print', 'raw_printf']);
const CMP = ['strncmp', 'strncmpi', 'strcmp', 'strcmpi', 'strcasecmp', 'strncasecmp',
  'strstri', 'strstr', 'strchr', 'index', 'BSTRCMP', 'BSTRCMPI', 'BSTRNCMP',
  'BSTRNCMPI', 'fuzzymatch', 'wordcount', 'streq'];
const CMP_RE = new RegExp('\\b(' + CMP.join('|') + ')\\s*\\(', 'g');
// files whose strings never reach WebHack's React display
// classic-tty windowport renderers whose output WebHack replaces with its
// winheadless→React frontend. botl.c: status bar. rip.c: the ASCII "REST IN PEACE"
// tombstone (genl_outrip) — winheadless registers its own headless_outrip that sends
// structured death data to React, so genl_outrip's ASCII art is never used here.
const TTY_ONLY = new Set(['botl.c', 'rip.c']);
// files whose entire body is compiled out of the WebHack build via a preprocessor
// gate the regex tracker can't see. mail.c: lines 8-777 are inside `#ifdef MAIL`,
// and the build defines -DNOMAIL, so unixconf.h leaves MAIL undefined — the whole
// fake-mail-daemon feature never compiles, so none of its literals ever display.
const DEAD_CODE_FILES = new Set(['mail.c']);
// platform-specific sources/headers that are NEVER part of the WebHack (Emscripten)
// build — the WASM Makefile compiles win/headless + sys/wasm only, and includes its own
// config, so these classic DOS/WinCE/UNIX-terminal files are not compiled at all:
//   pcconf.h  — MS-DOS build config (#message warnings inside DOS-screen #ifdefs)
//   wceconf.h — Windows CE build config (platform-name #defines, #error banner)
//   ioctl.c   — UNIX tty job-control (SIGTSTP suspend / "no job control") — no tty in browser
//   unixunix.c— UNIX process layer (fork/shell/lockfile) — none of it runs under WASM
const NON_WASM_FILES = new Set(['pcconf.h', 'wceconf.h', 'ioctl.c', 'unixunix.c']);
// headers/files whose string literals belong to a BUILD-TIME tool, not the runtime
// game. qtext.h: the quest-text COMPILER's error-message #defines (CREC_IN_MSG,
// DUP_MSG, "…recompile", "Adjust N_HDR", …) — runtime questpgr.c uses only its
// constants (N_HDR/QT_*), never these error macros, so they never compile into the game.
const BUILD_TOOL_FILES = new Set(['qtext.h']);
// pure data/name tables localized through the object/monster NAME catalogs (or
// build config), not the message catalog
const NAME_TABLE = new Set(['objects.c', 'monst.c', 'objects.h']);

// --- Unknown-resolution layer -------------------------------------------------
// Best-effort labels for what would otherwise be 'unclassified'. Each rule is a
// heuristic (stated in the reason), not proof — a text scan still can't do full
// data-flow. The goal is to give every literal a defensible translate/exclude
// verdict a human can audit, instead of a blanket "I don't know".

// Function contexts whose string ARG is developer/diagnostic/file-IO/config-parse
// only — never shown to the player. (Deliberately excludes ultra-generic names
// like read/write/open that collide with game identifiers.)
const NONDISPLAY_FUNCS = new Set([
  // stdio / file / process I/O and logging
  'fprintf', 'Fprintf', 'printf', 'vprintf', 'fputs', 'perror', 'fopen', 'fclose',
  'freopen', 'fflush', 'gzopen', 'gzprintf', 'execl', 'sscanf', 'paniclog', 'error',
  'open', 'write', 'stricmp',
  // diagnostics / sanity dumps / #ifdef DEBUG chains
  'config_error_init', 'config_error_add', 'debugpline', 'debugpline0', 'debugpline1',
  'debugpline2', 'debugpline3', 'debugpline4', 'ifdebugresist', 'objlist_sanity',
  'mon_obj_sanity', 'sanity_check_single_mon', 'obj_chain', 'mon_chain',
  'mon_invent_chain', 'engr_stats', 'light_stats', 'timer_stats', 'region_stats',
  // config / option / symset parsing (parse-coupled, kept English)
  'match_optname', 'match_varname', 'bind_key', 'load_symset', 'set_symset_name',
  'set_configfile_name', 'parse_json_field_int', 'parse_json_field_str',
  'dname_to_dnum', 'find_level', 'win_choices_find', 'choose_windows',
  'wc2_supported', 'wc_supported', 'preference_update',
  // dead platform code (Amiga speaker) — not compiled into the WebHack build
  'amii_speaker', 'playstring',
  // internal identifiers/keys, not display text: timer-func names, windowport
  // names, parse suffix tests, symbol-map corner names, sanity-check dumps
  'TTAB', 'WINDOWPORT', 'str_end_is', 'bad_negation', 'insane_object',
  'set_corner', 'browse_map', 'makemaz', 'rnd_otyp_by_namedesc', 'emit_message',
  'copynchars', 'NetHackQtStringRequestor',
  // NOTE: 'palette' and 'handle_add_list_remove' are contextOf MISDETECTIONS on
  // the options table (fn-pointer/struct field picked up as the "call"); their
  // multi-word args are displayed option-help text. Kept OUT of here so
  // isMessageLike surfaces them as untranslated; single-token option keywords
  // are handled by the options.c INTERNAL file rule via DATA_TABLE_CTX below.
]);
// Function contexts whose string ARG reaches the player: death/damage "killer"
// reasons ("Killed by <reason>"), menu/prompt titles, object/monster name+verb
// assembly ("The <x> <verb>s."). Marked untranslated (needs translation).
const DISPLAY_FUNCS = new Set([
  // death / damage reason strings
  'losehp', 'losexp', 'burn_dmg', 'poisoned', 'b_trapped', 'water_damage',
  'selftouch', 'mselftouch', 'make_stoned', 'make_slimed', 'make_grave',
  'instapetrify', 'revive_nasty', 'u_slip_free', 'burn_away_slime', 'strange_feeling',
  'pay_for_damage',
  // menu / prompt / query titles shown to the player
  'end_menu', 'start_menu', 'query_objlist', 'query_category', 'getpos', 'getobj',
  'safe_qbuf', 'paranoid_query', 'dospellmenu', 'choose_classes_menu', 'query_attr',
  'add_herecmd_menuitem', 'getlin', 'headless_getlin',
  // object / monster NAME + verb assembly -> appears inside messages
  'aobjnam', 'Tobjnam', 'Yobjnam2', 'yobjnam', 'xname', 'cxname', 'corpse_xname',
  'x_monnam', 'short_oname', 'fqname', 'otense', 'locomotion', 'distant_name',
  'ansimpleoname', 'simpleonames', 'shk_names_obj', 'xcalled',
  // effect/reason/verb args that land in a player message
  'flooreffects', 'mayberem', 'E_phrase', 'thitu', 'wield_tool', 'strsubst',
  'see_lamp_flicker', 'floating_above', 'already_wearing', 'already_wearing2',
  'invdisp_nothing', 'monkilled', 'erode_obj', 'read_tribute', 'ADDNTOBUF', '_',
  'set_occupation',
]);
// A literal that reads like a player-facing phrase: after masking format specs,
// it either ends like a sentence, glues a word to a %-spec (a template), or is a
// multi-word phrase. Single bare tokens ("color", "sysflags") do NOT match.
function isMessageLike(v) {
  const s = v.replace(/%[-+ 0-9.*#lhjzt$]*[a-zA-Z]/g, '').replace(/\\[ntr"]/g, ' ').trim();
  if (!/[A-Za-z]/.test(s)) return false;
  if (/[.!?:]\s*$/.test(s)) return true;                 // ends like a sentence
  if (/%[-+ 0-9.*#lhjzt$]*[a-zA-Z]/.test(v)) return true; // format spec + words -> template
  return s.split(/\s+/).filter(w => /[A-Za-z]/.test(w)).length >= 2; // multi-word
}
// Array-sibling consistency: a bare single-word literal must not be judged on its
// own word count — look at its neighbours. If ANOTHER string in the SAME immediate
// {…} initializer is a clear display phrase (message-like) or already translated,
// the whole flat array is a display table, so this token is display too. (Uses the
// IMMEDIATE brace: a flat `{"a","b c"}` shares one brace so all are siblings; a
// struct array `{{"a",X},{"b c",Y}}` gives each string its own brace, so option
// key/value tables are NOT wrongly merged.)
function arrayHasDisplaySibling(masked, startIdx, catalog) {
  let depth = 0, open = -1;
  for (let i = startIdx - 1; i >= 0 && startIdx - i < 8000; i--) {
    const c = masked[i];
    if (c === '"') { i--; while (i >= 0 && masked[i] !== '"') i--; continue; }
    if (c === '}') depth++;
    else if (c === '{') { if (depth === 0) { open = i; break; } depth--; }
    else if (c === ';') return false; // statement boundary — not inside an initializer
  }
  if (open < 0) return false;
  let d = 0;
  for (let i = open; i < masked.length; i++) {
    const c = masked[i];
    if (c === '"') {
      const strAt = i; let v = '', j = i + 1;
      while (j < masked.length && masked[j] !== '"') { if (masked[j] === '\\') { v += masked[j] + (masked[j + 1] || ''); j += 2; } else { v += masked[j]; j++; } }
      if (d === 1 && strAt !== startIdx && (isMessageLike(v) || v in catalog)) return true;
      i = j; continue;
    }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) break; }
  }
  return false;
}
// For bare single-token literals in data-table positions, the deciding signal is
// the FILE: some files' static string tables are player-visible descriptors,
// some are internal config keys / identifiers. Curated from reading each table.
const DATA_TABLE_CTX = new Set(['array/struct-init', 'assignment', 'return', '(other)',
  '(paren)', '#define', 'A', 'Strcat', 'Strcpy', 'Sprintf', 'strcat', 'strcpy',
  'sprintf', 'snprintf', 'strsubst', 'strncpy', 'if', 'sizeof',
  'palette', 'handle_add_list_remove']);
// bare tokens here are shown to the player (class/rank/attr/status/body-part/
// sound/direction/currency/race/material descriptors)
const DISPLAY_TABLE_FILES = new Set(['drawing.c', 'role.c', 'attrib.c', 'timeout.c',
  'eat.c', 'trap.c', 'sounds.c', 'polyself.c', 'do_name.c', 'mondata.c', 'invent.c',
  'mkobj.c', 'cmd.c', 'apply.c', 'zap.c', 'dig.c', 'objnam.c',
  // tail (iter 3): attack/damage/death descriptors, prayer adverbs, god & Wizard
  // taunt names, armor slots, weapon skills, artifact effect verbs, surface types
  'wizard.c', 'mhitu.c', 'weapon.c', 'artifact.c', 'do_wear.c', 'music.c', 'end.c',
  'uhitm.c', 'priest.c', 'pray.c', 'explode.c', 'engrave.c',
  // tail (iter 4): container/material names, quest-text pronouns, status labels,
  // terrain/look descriptors, throw/spell descriptors
  'potion.c', 'write.c', 'shk.c', 'pager.c', 'questpgr.c', 'windows.c', 'steal.c',
  'lock.c', 'mhitm.c', 'spell.c', 'dokick.c', 'dothrow.c', 'mthrowu.c', 'read.c',
  'mkmaze.c', 'mcastu.c', 'wield.c', 'mon.c', 'light.c', 'do.c',
  // tail (iter 4 finish): mixed files where PARSE_RANGES carve out the internal
  // clusters; remaining bare tokens are displayed
  'hack.c', 'steed.c', 'dbridge.c', 'vault.c', 'worn.c', 'teleport.c', 'detect.c',
  'save_slots.c', 'topten.c', 'pickup.c', 'hacklib.c', 'rip.c']);
// bare tokens here are displayed PROPER NAMES (shopkeeper / player-monster /
// artifact names)
const PROPER_NAME_FILES = new Set(['shknam.c', 'mplayer.c', 'artilist.h', 'dog.c']);
// bare tokens here are internal: option names, control-char sets, function names
// for debug, data-file/filename templates, parse-coupled level identifiers,
// build/platform config
const INTERNAL_TABLE_FILES = new Set(['options.c', 'decl.c', 'sp_lev.c', 'files.c',
  'dungeon.c', 'global.h', 'config.h', 'xwindow.h',
  // build/platform config + GUI-port headers (filenames, paths, resource keys,
  // dev constants) + the headless windowport's protocol style-tokens
  'dlb.h', 'hack.h', 'qt_win.h', 'xwindowp.h', 'winheadless.c',
  // iter 4: mail spool paths, cmap/symset symbol identifiers, command-line args,
  // build/entry-point plumbing, unused Qt port
  'mail.c', 'display.c', 'mapglyph.c', 'allmain.c', 'o_init.c', 'main_wasm.c',
  'wasm_tty_stubs.c', 'qt_win.h']);
// Specific data tables that are INTERNAL despite living in a display-ish file:
// config/parser keyword tables + strcmp-parse tables. Their string members are
// keys the code matches on, not text shown to the player.
const INTERNAL_ARRAYS = new Set([
  'loadsyms',       // drawing.c — symbol-set parser keywords
  'spkeys_binds',   // cmd.c — key-binding names (rc-file config)
  'compopt',        // options.c — option {name, help}; WebHack's options UI is React (tty text unused)
  'o_ranges', 'wrp', // objnam.c — strcmpi/strncmpi parse tables (matching typed input)
  'special_subjs',  // objnam.c — English singular words that look plural, used by vtense()
                    // (iterated at objnam.c:2269) and makesingular() wish-parse
                    // (singplur_lookup at 2705). Match-only English grammar data:
                    // vtense returns before it for zh (uses_plurals()==0), and the
                    // forms (Cyclops/aklys/"detect monsters") are what a player TYPES
                    // when wishing — translating them would break English parsing.
  'compositions',   // write.c — strcmpi-matched vs OBJ_DESCR (parchment/vellum/cloth); the
                    // displayed material is the OBJ_DESCR itself, this table is match-only
  'falsematch', 'truematch', // mondata.c name_to_mon() — reject-list / alt-spelling tables
                    // matched against typed monster names (wishing/#genocide), not display
  'known_restrictions', // drawing.c — symbol-set restriction names ("primary"/"rogue")
                    // matched against the symset config, not display prose
]);
// Tables of {command-name, description}: the single-token NAME is typed to invoke
// the command and searched via strstri — must stay English; the multi-word
// DESCRIPTION is displayed (translated normally).
const COMMAND_NAME_ARRAYS = new Set(['extcmdlist',
  // options.c default_menu_cmd_info[]: the `name` column ("menu_first_page"/…) are
  // menu-command config keywords matched on bind input; the `desc` column ("Go to
  // first page") is display (translated). COMMAND_NAME_ARRAYS excludes only the
  // no-whitespace keyword column, leaving the descriptions as a translation surface.
  'default_menu_cmd_info',
  // options.c paranoia[]: argname/synonym ("Confirm"/"die"/"wand-break"/…) are
  // config-parse tokens (match_optname at 2934) displayed RAW (*argname accelerator,
  // Sprintf(" %s", argname) settings dump) — never _()-wrapped. Only .explain is shown
  // via _(paranoia[i].explain). Excludes the no-space keyword columns (incl. 7 that were
  // falsely counted translated via unrelated catalog hits), keeps descriptions display.
  'paranoia',
  // options.c msgtype_names[]: .name ("show"/"hide"/"noshow"/…) is a strncmpi-matched
  // config keyword (options.c:1771); .descr is shown via _(msgtype_names[i].descr).
  'msgtype_names']);
// file-scoped internal arrays (the array name alone collides across files — e.g.
// `names[]` is a display table in invent.c but a strncmpi parse-alias table in
// mondata.c/name_to_mon)
// literals that are internal plumbing (file paths, save/pref filenames, accelerator
// char sets) matched by exact value within a file — never shown to the player.
const INTERNAL_VALUES_BY_FILE = {
  // date.h: auto-generated at build time (build timestamp + version-banner strings fed to
  // version.c). Regenerated every compile — not a translatable source surface.
  'date.h': new Set([
    'Tue Nov 18 21:41:33 2025',
    'Windows NetHack Version 3.6.7-0 post-release - last build Tue Nov 18 21:41:33 2025.',
    '         Version 3.6.7-0 Windows post-release, built Nov 18 21:41:33 2025.',
  ]),
  // patchlevel.h: legal copyright / attribution banner (Copyright, Stichting Mathematisch
  // Centrum & M. Stephenson, license notice) — conventionally kept verbatim, not localized.
  'patchlevel.h': new Set([
    'NetHack, Copyright 1985-2025',
    '         By Stichting Mathematisch Centrum and M. Stephenson.',
    '         See license for details.',
  ]),
  // config1.h: the "NetHack:" brand/name prefix #define — product name, not a message.
  'config1.h': new Set(['NetHack:']),
  // write.c: strncpy spelling-normalization patch ("armour"->"armor ") applied to the
  // scroll-label lookup string before matching — English string surgery, never displayed.
  // "into ": new-book-description prefix ("turns into <material>"), gated to the English
  // (nhi18n_uses_articles()) branch — zh's "变成了<材料>" verb already conveys "into".
  'write.c': new Set([' armor ', 'into ']),
  // do_wear.c: unknown_type[] is the impossible() warning format (internal error diagnostic,
  // never a normal player message); "rl" is the yn_function Right/Left accelerator key set.
  'do_wear.c': new Set(['Unknown type of %s (%d)', 'rl']),
  // mkmaze.c: orcfruit[] names fed to fruitadd() — become dynamic fruit-name data rendered
  // raw by the fruit-name system (player-customizable chain), not a gettext message surface.
  'mkmaze.c': new Set(['paddle cactus', 'dwarven root']),
  // read.c: T-shirt slogan that is High Valyrian (Game of Thrones "Valar morghulis / Valar
  // dohaeris") — a deliberately foreign constructed-language phrase, kept verbatim like any
  // non-English flavor text (translating it would destroy the reference).
  'read.c': new Set(['/Valar morghulis/ -- /Valar dohaeris/']),
  // apply.c: internal two-pass safe_qbuf scaffold for the candelabrum-attach query. " to\\033"
  // is a temporary ESC-marked length placeholder (thesimpleoname reserves space for the
  // candles fit); it's stripped at 1221 (strstri(qbuf," to\\033") -> Strcpy(q," to ")) and the
  // candelabrum is re-formatted in a 2nd safe_qbuf pass — none of this literal reaches the player.
  'apply.c': new Set([' to\\033%s?']),
  // explode.c: self-explosion killer.name in the English (nhi18n_uses_articles()) branch —
  // uses uhim()/uhis() reflexive pronouns ("caught himself in his own X"); zh takes the
  // else-branch `_("caught in one's own %s")` -> "被自己的%s波及" (自己 covers the reflexive).
  'explode.c': new Set(['caught %sself in %s own %s']),
  // shk.c: the_contents_of[] "the contents of " prefix — English (nhi18n_uses_articles())
  // branch only. Chinese reverses the possessive (X的内含物, container first), so zh takes
  // else-branches that put the container name first; this prefix never runs for zh.
  'shk.c': new Set(['the contents of ']),
  // steal.c: possessive pronoun in the English (nhi18n_uses_articles()) branch of the
  // steal-gold body-part message (whose = "your" vs zh "you", with "的" supplied by the zh
  // format); English-branch only, never runs for zh.
  'steal.c': new Set(['your']),
  // invent.c: silly_thing()'s 'P','R'-vs-'W','T' command-hint verbs (s2 = "take"/"put") live
  // inside the `#if 1 … #else … #endif` obsolete block (the #if-1 branch compiles nhUse(); the
  // #else handling is never compiled) — dead code, text never displays.
  'invent.c': new Set(['take', 'put']),
  // mthrowu.c: " flesh" suffix appended after s_suffix in the English (nhi18n_uses_articles())
  // branch of the silver-sears message; zh takes the else-branch `_("%s's flesh")` -> "%s的血肉",
  // so this English possessive+flesh construction never runs for zh.
  'mthrowu.c': new Set([' flesh']),
  // polyself.c: udeadinside() self-genocide "feel %s inside" adjectives, only in the English
  // (nhi18n_uses_articles()) branch; zh takes the distinct-key else-branch (死的/空的 are the
  // homograph senses), so "dead"/"condemned"/"empty" never run for zh.
  'polyself.c': new Set(['dead', 'condemned', 'empty']),
  // lock.c: "its lock" object noun, only in the English (nhi18n_uses_articles()) branch of the
  // pick-lock prompt; zh takes the else-branch that drops the redundant object, so it's dead
  // for zh. (The verb column fix/lock/unlock/pick is strcmp-compared → kept English.)
  'lock.c': new Set(['its lock']),
  // hacklib.c: ordin() English ordinal suffixes ("th"/"st"/"nd"/"rd" as in "5th"); ordin()
  // now returns "" for zh (gated on nhi18n_uses_plurals()), which uses 第N instead — so these
  // suffixes never run for zh. English number morphology, not translatable prose.
  'hacklib.c': new Set(['th', 'st', 'nd', 'rd']),
  // trap.c: indefinite-article prefix ("a"/"an") for trap/musical-note names — both sites now
  // gated behind nhi18n_uses_articles() (0 for zh, which strips articles), so this English
  // branch never runs for zh. (Byte-level *tn=='A' vowel test was also wrong on zh names.)
  'trap.c': new Set(['an']),
  // uhitm.c: shade-miss message pieces in the English-only branch (nhi18n_uses_articles());
  // zh takes the reordered single-format else-branch (possessive "…的", verb+prep "无害地穿过"
  // as one unit), so the English possessive subject and " harmlessly through " never run for zh.
  // "an": singular-egg indefinite article, English branch only (zh uses "" — no article).
  'uhitm.c': new Set(['Your', ' harmlessly through ', 'an']),
  // dog.c: role-specific default PET names (Slasher/Hachi/Idefix/Sirius) assigned as petname
  // then christened onto the pet — proper-name data rendered raw via Monnam, not a gettext
  // surface; cultural-reference proper nouns kept in original form (cf. orcfruit, Moloch).
  'dog.c': new Set(['Slasher', 'Hachi', 'Idefix', 'Sirius']),
  // mplayer.c: default player-monster proper names (Adam/Eve/Maud) — Strcpy'd as the monster's
  // name, rendered raw via Monnam; proper-name data, not translatable prose. ("Janet" nearby
  // is a strcmp'd dev-name key, likewise English.)
  'mplayer.c': new Set(['Eve', 'Adam', 'Maud']),
  // decl.c: c_common_strings.c_the_your[]={"the","your"} article selector and
  // c_fakename[]={"mon","you"} — grammar helpers left un-wrapped by design (decl.h:314);
  // fakename[] are vtense() sentinels (never displayed), the_your[] an article picker (zh
  // strips articles). English grammar machinery, not translatable prose.
  'decl.c': new Set(['the', 'your', 'mon']),
  // mondata.c: makesingular() English-morphology surgery — Strcpy(s+4,"ex") rewrites the
  // "vortices"->"vortex" tail in-place on the English name; parse-only, never displayed.
  'mondata.c': new Set(['ex']),
  // attrib.c: exerchk debugpline2("exerchk: testing %s …") attribute label ("Cha?"/"???"
  // fallbacks) — wizard-mode diagnostic output, not a player-facing message.
  'attrib.c': new Set(['Cha?']),
  // save_slots.c (our headless windowport): slot .sav/.meta filesystem path formats and the
  // machine-readable JSON gender token written into the metadata file. The React save-editor
  // parses these and renders localized labels itself — none of it is player-facing text.
  'save_slots.c': new Set([
    '%s/slot_%03d.meta', '%s/slot_%03d.sav', 'save_slots/slot_%03d.sav',
    'Female', 'Male',
  ]),
  // files.c: save-file / preference-file path construction (fqname/Sprintf) and the
  // menu-accelerator character set. Filesystem plumbing, not display text.
  'files.c': new Set(['validate', '[.save]%d%s', 'save/%d%s', 'save',
    'NetHack Defaults', 'Library/Preferences/NetHack Defaults',
    'Library/Preferences/NetHack Defaults.txt', 'sys$login:',
    'system configuration file',
    '*ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-.',
    // dumplog-status diagnostics (DUMPLOG undefined in WASM → "not supported"; the #else
    // branch text is dead) and the config-parse-error fallback label.
    'Unknown error', 'not supported', 'DUMPLOGFILE is not set in ',
    ' is missing; no DUMPLOGFILE setting']),
  // options.c: rc-file parse-error labels, used only as config_error_add("%s: %s",
  // re_error, …) args (config_error_add is a DEV/config-diagnostic sink) — surfaced
  // only when the user's config file has a bad regex/syntax, not gameplay text.
  'options.c': new Set(['MSGTYPE regex error', 'Regex error', 'Menucolor regex error',
    'regex error in AUTOPICKUP_EXCEPTION', 'syntax error in AUTOPICKUP_EXCEPTION',
    // default 'fruit' name (nmcpy into pl_fruit); becomes dynamic fruit-name data rendered
    // raw by the fruit-name system (player-customizable chain), not a gettext surface.
    'slime mold',
    // mouse_support option-value suffixes (#ifdef WIN32 QuickEdit / #else O/S) shown in
    // the classic tty options-value display, which WebHack's React options UI replaces.
    ', QuickEdit off', ', QuickEdit unchanged', ', O/S adjusted', ', O/S unchanged']),
  // cmd.c reset_commands(): movement direction-key charsets (sdir/sdir_swap_yz) — each
  // char is a bound movement key matched on input, must stay English/ASCII.
  'cmd.c': new Set(['hykulnjb><', 'hzkulnjb><',
    // wiz_show_stats() memory-usage table header (stats_hdr[], wizard #stats), and the
    // visctrl key-name label "<del>" (keyboard key display, kept as a fixed token).
    '                             count  bytes', '<del>',
    // clairvoyance enl_msg: strncpy overwrites from_what()'s " because of " with " if not for "
    // (12-byte in-place surgery, guarded by strncmp(buf," because of ",12)). For zh from_what
    // returns localized text so the strncmp never matches — this English branch never runs.
    ' if not for ']),
  // DEV diagnostics Sprintf'd into a buffer THEN passed to panic()/impossible()/trickery()
  // or a debug-dump putstr — the classifier's DEV-by-callee check can't see through the
  // buffer indirection. All are developer/crash text, never shown in normal play.
  'dungeon.c': new Set(['u_on_newpos: trying to place hero off map <%d,%d>',
    // fatal dungeon.def load failure, assembled then raw_print/panic'd.
    'Cannot open dungeon description - \\"%s', '\\" resource!', '\\" file!',
    // dungeon-branch name match key (dname_to_dnum/at_dgn_entrance vs dungeon.def).
    'The Quest',
    // level-name lookup key reassigned before find_level(nam) (gehennom/hell -> tower/valley);
    // a search key fed to find_level, never displayed.
    ' to Vlad\'s tower']),
  // "The Quest" branch-name match key (at_dgn_entrance/dungeon_branch), must stay English.
  'do.c': new Set(['The Quest']),
  'quest.c': new Set(['The Quest']),
  // weapon.c: static bad_skill[] impossible() diagnostic (decl site, DEV-by-callee misses).
  // weapon_descr() ammo/tool descriptors (stone/gem/arrow/bolt/hook/mattock) — the return is
  // strcmp/makesingular/makeplural-compared by callers (do_wear thiswep-vs-otherwep & vs
  // "food"/"corpse", cmd wielding line) so it MUST stay English; every display site now wraps
  // it (`_(otherwep)`/`_(thiswep)`/`_(which)`/`_(what)` in do_wear/polyself/cmd, all catalogued
  // 岩石/宝石/箭/弩箭/钩/鹤嘴锄), so it's the cmpLits case: keep English, translate at display.
  'weapon.c': new Set(['weapon_hit_bonus: bad skill %d',
    'stone', 'gem', 'arrow', 'bolt', 'hook', 'mattock']),
  // dbridge.c: E_phrase(etmp, "try"/"commit"/"survive"/"die") verbs are all args to
  // debugpline1/2() (DEV); player-facing E_phrase calls use _("are")/_("disappear").
  'dbridge.c': new Set(['try', 'commit', 'survive', 'die']),
  // teleport.c: level-teleport landing verb fragments in the nhi18n_uses_articles()
  // English branch ("trigger"/"float"/"%s onto"); zh uses single-format You() strings.
  'teleport.c': new Set(['trigger', 'float', '%s onto']),
  // objnam.c: xname fallback for an object with no valid name (unknown otyp) and the
  // post-impossible("Alphabet soup") an()/the() fallbacks — DEV, never shown in play.
  'objnam.c': new Set(['glorkum[%d]', 'glorkum %d %d %d', 'an []', 'the []',
    // potion xname English fall-through (after the `if (cnoun){…药水…break;}` zh block);
    // reached only when cnoun==NULL (non-zh). All objnam "potion" literals are English —
    // zh always renders via cnoun (药水).
    'potion', ' potion',
    // wishymatch()/mkglob() spelling-canonicalization constructions matched against
    // object names ("detect X"<->"X detection" inversion; "glob of <mon>") — parse, not display.
    'detect ', ' detection', 'glob of %s']),
  // mhitm.c: monster-miss fmt in the `if (… || nhi18n_uses_articles())` ENGLISH branch;
  // zh (no articles, non-seduce) takes the else branch which builds the message with
  // _("misses")="没打中". So "%s misses" is a runtime-dead English-only path for zh.
  'mhitm.c': new Set(['%s misses', '%s swallows', '%s gazes at',
    // seduce verbs in the English-only branch (nhi18n_uses_articles()); zh takes the
    // reordered single-format `_("%s %s toward %s %s.")` else-branch (adverb-before-verb),
    // so these English-branch phrases never run for zh — dead for zh.
    'smiles at', 'talks to',
    // " flesh" suffix appended after s_suffix in the English branch of the silver-sears
    // message; zh takes the else-branch (_("%s's flesh")/_("its own flesh")) — dead for zh.
    ' flesh']),
  // end.c: crash signal handler (SIG_MSG) + raw_printf bug-report crash text. Plus
  // death_fixups[].exclude/.include — strcmp'd against multi_reason (while-helpless
  // splice) to drop redundant death text; match keys, must stay English.
  'end.c': new Set(['\\nSignal received.\\n', '\\nand it may be possible to rebuild.',
    'getting stoned', 'fainted from lack of food', 'fainted',
    // build_english_list() "a, b, or c" conjunction — used only for sysopt.wizards
    // (files.c:2522), the sysconf wizard-mode username allowlist; a server/multi-user admin
    // feature, English username-list punctuation, not WebHack player-facing text.
    'or ',
    // unique-monster vampire-shape article: Sprintf(shape, "the %s", fakenm) now gated by
    // nhi18n_uses_articles() ? "the %s" : "%s" — the "the %s" branch never runs for zh
    // (consistent with the zh-gated an()); zh strips the article.
    'the %s']),
  // artifact.c glow_verb(): the English "-ing" gerund suffix is Strcat'd only under
  // `if (ingsfx && nhi18n_uses_plurals())` — never appended for zh (no verb conjugation).
  'artifact.c': new Set(['ing']),
  // pray.c: post-impossible fallback god names ("No random god name?" Paranoia joke;
  // "unknown alignment." -> "someone"). DEV fallbacks, never reached in normal play.
  // "Moloch": proper name of the unaligned high god (static const char *Moloch), a proper
  // deity noun rendered raw via the god-name system, kept in original form.
  // "god"/"goddess": align_gtitle() return, strcmpi-compared in role.c:2106
  // (godgend = !strcmpi(align_gtitle(), "goddess")) — MUST stay English or gender detection
  // breaks; cmpLits case (the quest-text %G substitution is English-quest-data anyway).
  'pray.c': new Set(['your Friend the Computer', 'someone', 'Moloch', 'god', 'goddess']),
  // vault.c: Croesus's-gold grave epitaph, Sprintf(buf,…) -> make_grave(buf) — engraving
  // content rendered raw by the engraving system, not a message-catalog surface.
  'vault.c': new Set(["To Croesus: here's the gold recovered from %s the %s."]),
  // mklev.c: role-quest level-file name construction (Sprintf(fillname, "%s-loca",
  // urole.filecode) → find_level) — internal filename lookup, not display. Plus the
  // "The Quest" branch-name match key (at_dgn_entrance vs dungeon.def).
  'mklev.c': new Set(['%s-loca', '%s-fil', 'The Quest',
    // "Fort Ludios" dungeon-branch match key (dungeon_branch vs dungeon.def).
    'Fort Ludios',
    // make_engr_at/make_grave engraving CONTENT (Vlad's-tower graffiti, bell epitaph) —
    // stored as an engraving and rendered raw by the engraving system, never gettext'd;
    // not a message-catalog surface (cf. frontend object-name nomenclature).
    'Vlad was here', 'ad aerarium', 'Saved by the bell!']),
  // pager.c: whatis DB-lookup key surgery (strncpy "moist"->"wet" so "moist towel"
  // matches the "wet towel" dbase entry) — parse manipulation, not display.
  'pager.c': new Set(['wet',
    // altar-lookup English article branch ("%s %saltar" under nhi18n_uses_articles());
    // the else branch assembles the zh altar name without articles.
    '%s %saltar']),
  // spell.c dospellmenu: menu accelerator letter-RANGE strings ("a-zA"/"a-zA-%c" for
  // >26 spells) — selector-key labels, not translatable prose. "books": read_tribute()
  // section-selector key (picks the Discworld tribute passage set), not displayed.
  'spell.c': new Set(['a-zA', 'a-zA-%c', 'books']),
  // version.c: dev-build git-branch tag (#if NH_DEVEL_STATUS != RELEASED), config-missing
  // diagnostic, and the rt_opts ":PATMATCH:" runtime-option parse token — build/DEV/parse.
  'version.c': new Set(['%sbranch:%s', "[Configuration '%s' not available?]",
    ':PATMATCH:']),
  'questpgr.c': new Set(['msgnum: %d, delivery: %c',
    '[missing block message summary for #%05d]']),
  'rumors.c': new Set(['T start=%06ld (%06lx), end=%06ld (%06lx), size=%06ld (%06lx)',
    'F start=%06ld (%06lx), end=%06ld (%06lx), size=%06ld (%06lx)',
    'Error reading \\"%.80s\\".']),
  'sp_lev.c': new Set(['floodfill stack overrun',
    // prize_warning[] — impossible(prize_warning, "sokoban end") level-compiler diagnostic.
    'multiple prizes on %s level']),
  // windows.c: hup_procs[] window_procs struct name field for the SIGHUP null port —
  // internal port identifier (like "tty"/"X11"), never a player-facing string.
  'windows.c': new Set(['hup']),
  // sounds.c: raw_print'd sound-file load failure (Sprintf(text,"cannot read %.243s",…)) —
  // low-level config/data I/O error diagnostic, not normal gameplay text.
  'sounds.c': new Set(['cannot read %.243s']),
  'display.c': new Set(['wall_angle: %s: case %d: seenv = 0x%x']),
  'save.c': new Set(["Level #0 pid (%d) doesn't match ours (%d)!"]),
  'restore.c': new Set(["PID (%d) doesn't match saved PID (%d)!",
    "This is level %d, not %d!"]),
  'bones.c': new Set(["This is bones level '%s', not '%s'!"]),
  'mkobj.c': new Set(['place_object: \\"%s\\" [%d] off map <%d,%d>']),
  // steed.c: impossible("placing %s over %s…") self-placement sanity arg ("itself").
  'steed.c': new Set(['itself']),
};
const INTERNAL_ARRAYS_BY_FILE = {
  'mondata.c': new Set(['names']),
  // do_name.c rndorcname(): phonetic syllables concatenated into random orc names
  // (e.g. "Grishai") — name-generation fragments, not display text.
  'do_name.c': new Set(['v', 'snd']),
  // player-monster dev first names: compared via strncmp (dedup, mplayer.c:56)
  // and strcmp(devnam,"Janet") for gender — parse-coupled, must stay English.
  'mplayer.c': new Set(['developers']),
  // options.c config-value tables: rc-file keywords matched on input (colornames via
  // fuzzymatch) / option-value enums shown only in the classic tty options menu, which
  // WebHack replaces with its React options UI (cf. compopt). Must stay English to parse.
  'options.c': new Set(['colornames', 'menutype', 'runmodes', 'burdentype',
    // sortltype[] = sortloot config values ("none"/"loot"/"full"), matched on input.
    'sortltype']),
  // objnam.c: Japanese object-name aliases {otyp,"wakizashi"} — matched by readobjnam
  // (wishing) and swapped in for display via the names system, not this message catalog.
  // spellings[] = alt-spelling wish aliases ({"silver sabre",…}) matched by wishymatch/
  // strstri in readobjnam — parse input, never displayed, must stay English.
  'objnam.c': new Set(['Japanese_items', 'spellings']),
};
// file-scoped arrays that ARE display-wrapped but through a pointer chain the
// regex tracker can't follow. shknam.c: every shopkeeper-name table flows
// array -> nlp[i] -> shname -> ESHK->shknam -> shknm and is finally displayed
// via `Strcpy(nam, _(shknm))` in shkname() after the gender-prefix is stripped.
const WRAPPED_ARRAYS_BY_FILE = {
  'shknam.c': new Set([
    'shkliquors', 'shkbooks', 'shkarmors', 'shkwands', 'shkrings', 'shkfoods',
    'shkweapons', 'shktools', 'shklight', 'shkgeneral', 'shkhealthfoods']),
  // container-loot help: iterated as `for (txtpp = explaintext; *txtpp; ...)`
  // and displayed via `putstr(win, 0, _(*txtpp))` — pointer walk the regex can't follow.
  'pickup.c': new Set(['explaintext']),
  // pray.c: deity voice verb, shown via pline_The(_("voice of %s %s: …"),
  // …, _(godvoices[rn2(…)]), …) — array indexed then wrapped at the use site.
  'pray.c': new Set(['godvoices', 'hallu_gods']),
  // hack.c: Warning ice-danger messages, shown via pline(_("%s"), _(icewarnings[i])).
  'hack.c': new Set(['icewarnings']),
  // music.c: drum-beat names, shown via an(_(beats[rn2(…)])) when drumming.
  'music.c': new Set(['beats']),
  // potion.c: random potion-vessel names, bottlename() -> _(bottlenames[rn2(…)]).
  'potion.c': new Set(['bottlenames']),
  // do.c: familiar-level arrival flavor, mesg=arr[which] then _(mesg) at Sprintf/pline1.
  'do.c': new Set(['fam_msgs', 'halu_fam_msgs']),
  // wizard.c: Wizard-of-Yendor taunts, shown via verbalize(_("%s %s!"),
  // _(random_malediction[…]), _(random_insult[…])) in cuss().
  'wizard.c': new Set(['random_insult', 'random_malediction']),
  // mplayer.c: player-monster taunts, shown via pline(_("Talk? -- %s"), _(…_msg[…])).
  'mplayer.c': new Set(['same_class_msg', 'other_class_msg']),
  // weapon.c #enhance menu: skill names via P_NAME macro (_(odd_skill_names[…]) /
  // _(barehands_or_martial[…])) and section headers via _(skill_ranges[i].name).
  'weapon.c': new Set(['odd_skill_names', 'barehands_or_martial', 'skill_ranges']),
  // spell.c sort-order menu, shown via add_menu(…, _(spl_sortchoices[i]), …).
  'spell.c': new Set(['spl_sortchoices']),
  // priest.c cranky-temple-priest greetings, shown via verbalize1(_(cranky_msg[…])).
  'priest.c': new Set(['cranky_msg']),
  // end.c vanquished-monster list sort menu, shown via add_menu(…, _(vanqorders[i]), …).
  'end.c': new Set(['vanqorders']),
  // topten.c death-cause prefixes, shown via strncat(buf, _(killed_by_prefix[how]), …)
  // then buf += kname; zh renders them as a "died-from"-style prefix that precedes kname.
  'topten.c': new Set(['killed_by_prefix']),
  // steal.c monster-theft verbs, shown via pline(_("%s tries to %s %s%s but gives up."),
  // Monnam, _(how[rn2(SIZE(how))]), …).
  'steal.c': new Set(['how']),
  // detect.c crystal-ball level-detect place names, shown via
  // You_see(_("%s, %s."), _(level_detects[i].what), …).
  'detect.c': new Set(['level_detects']),
  // pager.c named-orc supplement lore, shown via putstr(datawin, 0, _(suptext[i])) /
  // Sprintf(buf, _(suptext[i]), name) in the whatis '?' supplement.
  'pager.c': new Set(['suptext1', 'suptext2']),
  // shk.c: shopkeeper anger levels via _(angrytexts[…]); Izchak's shop hints via
  // pline(_(Izchak_speaks[…]), shkname); no_money/not_enough_money via pline(_(var)).
  'shk.c': new Set(['angrytexts', 'Izchak_speaks']),
  // Master Key trap-warning heat scale, shown via `pline_The(_("Key feels %s%c"),
  // _(heat[idx]), ...)` — static array indexed then wrapped at the use site.
  // glow_verbs now wrapped via `_(glow_verbs[…])` in glow_verb(), with the "-ing"
  // suffix gated on nhi18n_uses_plurals() (skipped for zh) — so no "颤动ing".
  'artifact.c': new Set(['heat', 'glow_verbs', 'mb_verb', 'behead_msg']),
  // exercise/abuse feedback 2D table, shown via `You(_("%s %s."), ...,
  // _(exertext[i][j]))` in exerchk().
  // inventory menu class-header tables: `class_name = _(names[oclass])` and
  // `class_name = _(oth_names[...])` in drop-menu class labelling.
  'invent.c': new Set(['names', 'oth_names']),
  // locomotion/stagger movement-verb tables, returned via `return _(… arr[idx] …)`
  // (verb returned directly, no suffix appended — safe unlike glow_verbs).
  'mondata.c': new Set(['levitate', 'flys', 'flyl', 'slither', 'ooze',
    'immobile', 'crawl']),
  // zap.c wish-assist number words, shown via `_(cardinals[triesleft])`; and
  // destroy_strings[][3] item-destruction verbs/reasons, shown via
  // `_(destroy_strings[dindx][…])` (singular/plural cols collapse to same zh).
  'zap.c': new Set(['cardinals', 'destroy_strings', 'wishinfo']),
  // mhitu.c gaze-reaction adjectives, shown via `pline(…, _(reactions[react]))`.
  'mhitu.c': new Set(['reactions']),
  // options.c number_pad value labels: npchoices via add_menu(_()), numpadmodes
  // (current-setting display) via Strcpy(buf, _(numpadmodes[indx])).
  // othropt[] "other settings" category labels shown via _(othropt[i].name) in the
  // opts_add_others() options menu ("autopickup exceptions"/"menu colors"/…).
  // opt_intro[]/opt_epilog[] = option_help() window intro/epilog lines, shown via
  // putstr(datawin, 0, _(opt_intro[i])) (CONFIG_SLOT runtime buf excluded at the call).
  'options.c': new Set(['npchoices', 'numpadmodes', 'othropt',
    'opt_intro', 'opt_epilog']),
  // mon.c monster-exclamation table, shown via `verbalize(_("%s"), _(Exclam[…]))`.
  'mon.c': new Set(['Exclam']),
  // (explode.c engulf-effect adjectives adj="heartburn"/… credit via the
  // assignment+scalarWrapped path — pline(_("%s gets %s!"), Monnam, _(adj));
  // the pay_for_damage verbs moved to DISPLAY_LITERALS_BY_FILE below.)
  // innate-ability tables: gainstr/losestr displayed via `_(abil->gainstr)` in
  // adjattrib(); `abil` is a role/race-indexed pointer the regex can't alias-resolve.
  'attrib.c': new Set(['exertext',
    'arc_abil', 'bar_abil', 'cav_abil', 'hea_abil', 'kni_abil',
    'mon_abil', 'pri_abil', 'ran_abil', 'rog_abil', 'sam_abil', 'tou_abil', 'val_abil',
    'wiz_abil', 'hum_abil', 'elf_abil', 'dwa_abil', 'gno_abil', 'orc_abil']),
};
// standalone string literals that are display-bound through a pointer the regex
// tracker can't follow. shknam.c assigns these to `shname`, stores them, then
// displays via `_(shknm)` in shkname() (prefix-stripped) — genuinely translated
// at runtime; credited when the catalog has the (prefix-bearing) source form.
const DISPLAY_LITERALS_BY_FILE = {
  'shknam.c': new Set(['+Izchak', '-Lucrezia', '+Dirk']),
  // mthrowu.c: invisible-target substitute (trgbuf=="it" -> "someone"), shown via
  // pline(_("%s %s %s%s%s!"), …, _(trgbuf)); live for zh (mon_nam returns raw "it").
  'mthrowu.c': new Set(['someone']),
  // mcastu.c: summon-monster subject noun, mappear=(count==1?…:…) shown via
  // pline(_("%s from nowhere!"), _(mappear)); ternary-init, ctx (other).
  'mcastu.c': new Set(['A monster appears', 'Monsters appear']),
  // muse.c: monster-bullwhip disarm subject, The_whip=(vismon?…:…) shown via
  // pline(_("%s fails to wrap around %s."), _(The_whip), …); ternary-init, ctx (other).
  'muse.c': new Set(['The bullwhip', 'A whip']),
  // explode.c: pay_for_damage(dmgstr) shop-damage verbs, dmgstr passed raw from the
  // call site then shown via verbalize(_("How dare you %s my %s?"), _(dmgstr), …) in
  // shk.c. ("dig into"/"damage" stay raw — strcmp-matched in pay_for_damage.)
  'explode.c': new Set(['burn away', 'shatter', 'disintegrate', 'destroy']),
  // o_init.c doclassdisco(): prompt[]/havent_discovered_any[] are declared in a
  // multi-declaration `static const char prompt[]=…, havent[]=…` (assignLHS can't
  // extract the name), then shown via _(prompt) / You(_(havent_discovered_any), …).
  'o_init.c': new Set(['View discoveries for which sort of objects?',
    "haven't discovered any %s yet.",
    // same multi-decl block; shown via You(_(havent_discovered_any), _(unique_items)).
    'unique items']),
  // (spell.c 'radiates explosive energy' and pickup.c "Schroedinger's Cat" are
  // merged into their existing DISPLAY_LITERALS_BY_FILE Sets below — those keys
  // already exist, so a second key here would be silently dropped.)
  // lock.c: interrupted lock-attempt message, static no_longer[] shown via
  // pline(_(no_longer), _("hold the")/_("reach the"), noun) — format renders zh (the
  // embedded object noun is a separate, still-English arg).
  'lock.c': new Set(['Unfortunately, you can no longer %s %s.',
    // object nouns filling the no_longer 2nd %s, shown via pline(…, _(what)).
    'pick', 'key', 'card',
    // trap-disarm container noun (what=CHEST?"chest":"box"), shown via
    // You(_("…The %s is still %slocked."), _(what), …); ternary-init scalarWrapped miss.
    'chest', 'box']),
  // mon.c xkilled(): kverb=(nonliving?"destroy":"kill") shown via the zh branch
  // Sprintf(zbuf, "你%s%s！", _(kverb), kwhom); ternary-init, scalarWrapped miss.
  'mon.c': new Set(['destroy', 'kill']),
  // uhitm.c hmonas(): martial-arts attack verb shown via the zh branch
  // Sprintf(zbuf, "你%s%s。", _(verb), mon_nam(mon)); switch-assigned, scalarWrapped miss.
  // "attack": shade-miss noun (what=(shade_aware?"attack":cxname)) shown via _(what) in the
  // zh single-format branch `_("%s's %s harmlessly passes through %s.")`; scalarWrapped miss.
  'uhitm.c': new Set(['kick', 'head butt', 'tentacles', 'attack',
    // corpse_xname() adjective arg (stolen corpse), now translated inside corpse_xname via
    // _(adjective) with zh adjective-before-noun spacing; ternary-arg scalarWrapped miss.
    'stolen']),
  // do.c: corpse_xname() adjective arg ("bite-covered" partly-eaten corpse), translated inside
  // corpse_xname via _(adjective) (zh: adjective precedes the noun, no space).
  'do.c': new Set(['bite-covered']),
  // worn.c: monster speed-change intensity, howmuch=(…)?"much ":"" shown via
  // pline(_("%s is suddenly moving %sfaster."), Monnam, _(howmuch)); ternary-init.
  'worn.c': new Set(['much ']),
  // mkobj.c: light-source glow subject, buf=(quan==1?"It":"They") shown via
  // pline(_("%s %s %s%s."), _(buf), otense(obj,_("shine")), …); ternary-init.
  'mkobj.c': new Set(['It', 'They']),
  // vault.c: guard invisible-name substitute (monnambuf=="It"->"Someone"), shown via
  // pline(_("%s%s picks up the gold%s."), _(monnambuf), …).
  'vault.c': new Set(['Someone']),
  // do_name.c x_monnam(): priest gender-title overrides, pm_name=(female?"priestess":
  // "priest")/"high priestess" shown via Strcat(buf, _(pm_name)) (i18n_name/English mname
  // pass through _() as a no-op; only these literal overrides get zh).
  'do_name.c': new Set(['priestess', 'high priestess']),
  // eat.c: mind-flayer brain-eating death reason, `static const char brainlessness[]=…`
  // shown via Strcpy(killer.name, _(brainlessness)) — the tombstone "killed by" cause.
  'eat.c': new Set(['brainlessness']),
  // files.c: tribute-book bad-passage message, `const char *badtranslation` shown via
  // pline(_("It's %s of \"%s\"!"), _(badtranslation), tribtitle).
  'files.c': new Set(['an incomprehensible foreign translation']),
  // objnam.c gloves_simple_name(): static gauntlets[] is strstri-matched raw against the
  // English object name AND returned for display via _(gauntlets) — display-vs-parse split.
  'objnam.c': new Set(['gauntlets']),
  // apply.c: `static const char foo[] = "..."` message strings displayed via
  // `pline(_(foo))` / `You(_(foo))` / `verbalize(_(foo))` — wrapped at the USE
  // site, not the declaration, so the decl-regex sees them as bare literals.
  'apply.c': new Set([
    'dig into', /* pay_for_damage(dmgstr) verb, wrapped at display via _(dmgstr) */
    'look %s.', /* look_str[] makeup/mirror clause, You(_(look_str), …); scalarWrapped miss */
    "There's not enough room here to use that.",
    'Where do you want to hit?',
    "won't hit anything if you can't see that spot.",
    "can't reach that spot from here.",
    'You tin it, you bought it!',
    'But nothing else happens...',
    // more apply.c statics shown via `You_hear(_(hollow_str), …)` / `You(_(whistle_str), …)`
    'a hollow sound.  This must be a secret %s!',
    'produce a %s whistling sound.',
    'produce a %s, sharp vibration.',
    "don't have enough elbow-room to maneuver.",
    // touchstone rubbing sound, static scritch[] shown via pline(_(scritch)).
    '\\"scritch, scritch\\"']),
  // invent.c: `static const char[]` shown via `_(not_carrying_anything)` at the
  // pline/add_menu use sites (decl line can't be _()-wrapped).
  'invent.c': new Set(['Not carrying anything',
    // adj_type item-move status prefix, shown via prinv(_(prefix)).
    'Collecting', 'Moving:', 'Splitting:', 'Merging:', 'Swapping:',
    'Splitting and merging:']),
  // do_wear.c: c_* armor/weapon slot-name statics, shown via already_wearing()'s
  // `_(cc)` and various `_(which)`/`_(what)`/`_(cond ? c_x : c_y)` use-site wraps.
  // 'helmet' is intentionally omitted — c_helmet only feeds dev-only impossible().
  'do_wear.c': new Set(['armor', 'suit', 'shirt', 'cloak', 'gloves', 'boots',
    'shield', 'weapon', 'sword', 'axe', 'that', 'helmet',
    // need_to_take_off_outer_armor[] shown via You(_(need_to_take_off_outer_armor),…)
    'need to take off %s to %s %s.',
    // takeoff.disrobing occupation verb, strncpy'd then shown via You(_("finish %s."),
    // _(disrobing)) / set_occupation occtxt (_("stop %s.")).
    'disrobing', 'disarming',
    // see_yourself[] invisibility-removal clause, shown via You(_("can %s!"),
    // … : _(see_yourself)); static-decl scalarWrapped miss.
    'see yourself']),
  // zap.c: `static const char[]` blindness/cancel/wish-assist strings, each shown
  // via `You(_(var))` / `pline(_(var))` / `putstr(win, 0, _(var))`.
  'zap.c': new Set([
    'are blinded by the flash!',
    'Some writing vanishes from %s head!',
    // wishinfo[] help line whose leading `pieces\"` quote defeats arrName detection (so the
    // 'wishinfo' WRAPPED_ARRAYS entry can't credit it); displayed via _(wishinfo[i]) at 5275,
    // already in catalog. Register by-value like its sibling lines below.
    'pieces\\", although that aspect of your wish might not be granted.',
    "Doing so will preserve 'wishless' conduct.",
    'If you specify an unrecognized object name %s%s time%s,',
    'a randomly chosen item will be granted.',
    '(Suppress this assistance with !cmdassist in your config file.)',
    'too many',
    // pay_for_damage(dmgstr) verbs, shown via verbalize(_("… %s …"), _(dmgstr)).
    // "damage" is also strcmp-matched in shk.c (wall vs door) so it stays raw here.
    'burn away', 'shatter', 'damage', 'disintegrate', 'destroy',
    /* cancel-writing possessive, static your[] via pline(_(writing_vanishes), _(your)) */
    'your']),
  // cmd.c wizard/unavailable-command templates, shown via `pline(_(unavailcmd),…)`
  // / `Sprintf(buf, _(cmdnotavail), …)` at every use site. Plus run_desc/
  // forcefight_desc command-key help, shown via `Sprintf(…, _(misc_keys[i].desc))`.
  'cmd.c': new Set(["Unavailable command '%s'.", "'%s' command not available.",
    'Prefix: run until something very interesting is seen',
    'Prefix: force fight even if you don\'t see a monster',
    // enlightenment (^X) frame-word statics — enlght_line() does
    // `Sprintf(_(" %s%s%s%s."), _(start), _(middle), _(end), ps)`, so You_/are/
    // were/have/&c ARE _()-wrapped at runtime; all in catalog (zh composes as
    // 你 + 曾/能/… + <attr> + 。). Trailing-space forms won't collide.
    'You ', 'are ', 'were ', 'have ', 'had ', 'can ', 'could ',
    'have been ', 'have never ', 'never ',
    // steed-rider enl_msg present/past ("you and %s is/are/was/were <predicament>"),
    // enl_msg args (SELF_WRAP) that the (paren)-ternary ctx misses; inCat. highc(*buf) is a
    // no-op on zh (multibyte first byte isn't a-z), so the steed frame is safe.
    'is ', 'was ',
    // more enlightenment attr statics, each shown via `_(var)` (Sprintf/enl_msg):
    // Power via Sprintf(…, _(Power)); Your_wallet/if_surroundings_permitted via
    // enl_msg(_(…))/`_(if_surroundings_permitted)`.
    'energy points (spell power)', 'Your wallet ', ' if surroundings permitted',
    // attribute-detail paren prefix, paren_pfx=(final?" (":" (current; "), shown via
    // Sprintf(_("%sbase:%s"), _(paren_pfx), …); ternary-init scalarWrapped miss (只 the
    // "current;" label is catalogued 「（当前；」; the bare " ("/", " separators stay ASCII).
    ' (current; ']),
  // pray.c cloud-of-smoke template, shown via `pline(_(cloud_of_smoke), …)`.
  // god-gift quote, static msg[] shown via pline(_(msg), _("Telepathy")/…).
  'pray.c': new Set(['A cloud of %s smoke surrounds you...',
    '\\"and thus I grant thee the gift of %s!\\"',
    // static leftglow[]/rightglow[] ring-uncurse subject clauses, shown via
    // pline(_("%s %s."), what ? _(what) : …, hcolor) — "%s %s."→"%s%s。" joins clause+color.
    'Your left ring softly glows', 'Your right ring softly glows']),
  // drawing.c farlook descriptions for invisible/remembered creatures, shown via
  // `an(_(unseen_explain))` / `Strcpy(lookbuf, _(invisexplain))` in pager.c.
  'drawing.c': new Set(['remembered, unseen, creature', 'unseen creature']),
  // pager.c farlook x_str values for empty/unexplored map, shown via `_(x_str)`;
  // 'aligned' altar-alignment shown via `_(algn_str)` in the zh altar branch.
  'pager.c': new Set(['unexplored', 'unknown', 'stone', 'aligned', 'high ',
    // look-at-tile descriptions: mon_interior/unreconnoitered shown via
    // Sprintf(out_str, "%s%s", prefix, _(x_str)); what_is_an_unknown_object is the
    // getpos() goal shown via pline(_("Move cursor to %s:"), _(goal)) in do_name.c.
    'the interior of a monster', 'unreconnoitered', 'an unknown object']),
  // trap.c: `static const char[]` messages shown via `_(txt)` / `_(sink_deeper)` /
  // `You_feel(…, _(historic_statue_is_gone))`.
  'trap.c': new Set(['protected by the layer of grease!',
    'that the historic statue is now gone', 'You sink deeper into the lava.']),
  // pickup.c encumbrance-lift messages, shown via `_(overloadmsg)` etc.
  'pickup.c': new Set(['You have a little trouble lifting',
    'You have much trouble lifting', 'You have extreme difficulty lifting',
    // quantum-cat proper name, static sc[] shown via christen_monst/oname(_, _(sc)).
    "Schroedinger's Cat"]),
  // dokick.c kick_passes_thru, shown via `pline_The(_("%s."), _(kick_passes_thru))`.
  'dokick.c': new Set(['kick passes harmlessly through',
    'break']), /* pay_for_damage(dmgstr) verb, wrapped at display via _(dmgstr) */
  // hack.c: metallivore/rock-eater dig verbs via You1(_(digtxt)); "damage"/"break"
  // dmgstr verbs (strcmp-matched in shk.c, raw) shown via _(dmgstr) at display.
  'hack.c': new Set([
    // low-HP death-warning subject: who=(Wizard/Valkyrie? urole.name.m : "Elf"), shown via
    // pline(_("%s is about to die."), _(who)); ternary-init scalarWrapped miss (catalogued 精灵).
    'Elf',
    'chew a hole in the wall.', 'chew through the tree.', 'eat through the bars.',
    'chew through the secret door.', 'chew through the door.',
    'chew a passage through the rock.', 'damage', 'break',
    /* sink-fall death reason, static fell_on_sink[] via losehp(_(fell_on_sink), …) */
    'fell onto a sink']),
  // dig.c: pay_for_damage(dmgstr) verbs, wrapped at display via _(dmgstr) in shk.c.
  'dig.c': new Set(['ruin', 'dig into', 'destroy']),
  // dothrow.c: pet/monster gift-acceptance responses, static const char[] Strcat'd into
  // buf then pline1(buf); multi-qualifier decl (NEARDATA const char[]) defeats scalarWrapped.
  'dothrow.c': new Set([' is not interested in your junk.', ' accepts your gift.',
    ' hesitatingly', ' graciously', ' gratefully',
    // invisible-monster substitute (mnam="it"->something/someone), shown via _(mnam).
    'something', 'someone']),
  // priest.c: temple-aura feeling msg1 template + msg2 adjective, shown via
  // You(_(msg1), _(msg2)); the "a" article is gated off for zh in the code.
  'priest.c': new Set(['have a%s forbidding feeling...',
    'experience %s sense of peace.', ' strange', 'an unusual']),
  // read.c: wand-overload adverb, expl=(cond?…:…) shown via pline(_("%s %s explodes!"),
  // …, _(expl)); ternary-assign ctx=(other) defeats the scalarWrapped credit.
  'read.c': new Set(['suddenly', 'vibrates violently and']),
  // artifact.c: drain-life noun, life=(nonliving?…:…) shown via pline_The(…, _(life)).
  'artifact.c': new Set(['animating force', 'life',
    // Muramasa behead wepdesc, shown via pline(_("%s cuts…"), _(wepdesc), …).
    'The razor-sharp blade']),
  // mondata.c: on_fire() default-branch ternary, shown via _(what) return.
  'mondata.c': new Set(['being roasted', 'on fire']),
  // mhitu.c: blind-monster attack verb, swings=(ternary) shown via
  // pline(_("%s %s wildly…"), Monst_name, _(swings)); ctx (other) needs by-value reg.
  // leash/leashes: s=(i>1?…) leash-snap subject, shown via pline_The(_("%s %s loose."),
  // _(s), vtense(s,_("snap"))); ternary-init scalarWrapped miss.
  'mhitu.c': new Set(['snaps', 'kicks', 'lunges', 'swings', 'leash', 'leashes']),
  // questpgr.c: quest-text %-code substitutions, str=(gender/blind ternary) shown via
  // _(str); ctx (other). Convention already translates these (see/sister/brother in cat).
  'questpgr.c': new Set(['sister', 'brother', 'daughter', 'son', 'sense', 'see',
    // %H/%I/%J plural-artifact pronoun substitution (pnoun=they/them/their), shown via
    // Strcpy(cvt_buf, _(pnoun)); ternary-init scalarWrapped miss. highc(cvt_buf[0]) is a
    // no-op on zh (multibyte first byte isn't a-z), so it doesn't corrupt 它们.
    'they', 'them', 'their']),
  // shk.c: no_money/not_enough_money statics shown via pline(_(no_money), …); their
  // multi-var `const char a[]=…, b[]=…;` decl defeats scalarWrapped LHS detection.
  'shk.c': new Set(['Moreover, you%s have no money.',
    "Besides, you don't have enough to interest %s.",
    // shk_names_obj sell formats — nested in a ternary so ctx is (other), not the
    // SELF_WRAP'd 'shk_names_obj'; shown via You(_(fmt), …). Already in catalog.
    'sold some items inside %s for %ld gold piece%s.%s',
    'sold %s for %ld gold piece%s.%s',
    'relinquish %s and receive %ld gold piece%s in compensation.%s',
    // dig-tool name in "Leave your %s outside" (tool=digging tool/pick-axe/mattock),
    // shown via verbalize/pline(…, _(tool), …). (Consolidated here from a duplicate
    // 'shk.c' key that this object's later entry was silently shadowing.)
    'digging tool', 'pick-axe', 'mattock',
    // and_its_contents[] bill suffix, shown via pline_The(_("…%s"), …, _(and_its_contents));
    // clean suffix ("the box and its contents" -> "…及其内容物"). scalarWrapped miss.
    ' and its contents']),
  // pager.c altar farlook: algn_str/high_str feeders assembled in the no-article
  // (zh) branch as _("high ")+_(algn_str)+_("altar"); English-branch raw feeders.
  // weapon.c: #enhance skill-proficiency level names, ptr=… then Strcpy(buf,_(ptr)).
  'weapon.c': new Set(['Unskilled', 'Basic', 'Skilled', 'Expert', 'Master',
    'Grand Master', 'Unknown',
    // rustprone-item wetness comparatives (ternary-init), shown via pline(…, _(wetness)).
    'damp', 'damper', 'wet', 'wetter']),
  // potion.c: vismsg/eyemsg/riseup templates shown via Your(_(vismsg),…)/You(_(riseup),…);
  // nomovemsg (shown via pline(_("%s"),_(nomovemsg)) in hack.c / pline1(_(nomovemsg))
  // in eat.c) and multi_reason (shown via _(multi_reason) in topten death message;
  // still strcmp-matched raw in end.c death_fixups, so assignment stays raw).
  'potion.c': new Set([
    'vision seems to %s for a moment but is %s now.', '%s momentarily %s.',
    'rise up, through the %s!', 'You regain your composure.',
    'You awake with a headache.', 'being frightened to death',
    'frozen by a potion',
    // alchemy un-bless glow color, glowcolor="brown" shown via hcolor(glowcolor) -> _().
    'brown',
    // dip-prompt last-resort name, shortestname=(plural?"them":"it") shown via
    // Sprintf(_("dip %s into"), flags.verbose ? obuf : _(shortestname)); ternary-init.
    'them', 'it']),
  // sit.c sit_message / mal_aura templates, shown via `You(_(sit_message), …)`.
  'sit.c': new Set(['sit on the %s.', 'feel a malignant aura surround %s.']),
  // mhitm.c brief_feeling template, shown via `You(_(brief_feeling), _("<mood>"))`;
  // plus the seduction miss-fmt shown via Sprintf(buf, _(fmt), Monnam) ("%s misses"
  // sibling is the English/article-only path — zh uses the hardcoded else-branch).
  'mhitm.c': new Set(['have a %s feeling for a moment, then it passes.',
    '%s pretends to be friendly to']),
  // spell.c surrounding-atmosphere names, shown via `pline_The(…, _(atmosphere), …)`.
  // Plus explodes[] spellbook-blowup verb, shown via pline_The(…, _(explodes)).
  'spell.c': new Set(['mist', 'maelstrom', 'maw', 'ooze', 'cloud', 'vegetation',
    'stone', 'air', 'radiates explosive energy']),
  // rumors.c fortune-cookie paper message, shown via `pline(_(fortune_msg))`.
  'rumors.c': new Set(['This cookie has a scrap of paper inside.']),
  // polyself.c use_thec ability hint, shown via `pline(_(use_thec), monsterc, _(act))`
  // (monsterc = the #command name, kept English on purpose).
  // 'Use the command…' = ability hint; no_longer_petrify_resistant[] = petrification-loss
  // sentence prefix shown via selftouch(_(…)) / pline(_("%s touch %s."), _(…)).
  'polyself.c': new Set(['Use the command #%s to %s.',
    'No longer petrify-resistant, you',
    // newman() drop-weapon message pieces, shown via the zh branch
    // You(_("find you must %s %s!"), _(what), _(which)); ternary/switch-assigned scalarWrapped
    // miss. (which can also be weapon_descr()'s output, translated at display via _(which).)
    'drop', 'release', 'sword']),
  // dungeon.c shop_string() shop-type names for the level-overview, returned via
  // `return _(str)` after a `str = "…"` switch.
  'dungeon.c': new Set(['shop', 'untended shop', 'general store', 'armor shop',
    'scroll shop', 'potion shop', 'weapon shop', 'delicatessen', 'jewelers',
    'wand shop', 'bookstore', 'health food store', 'lighting shop',
    // ADDNTOBUF dungeon-overview feature nouns, shown via `_(nam)` in the macro.
    'altar', 'fountain', 'grave', 'sink', 'temple', 'throne', 'tree']),
  // mkmaze.c waterbody_name() returns, wrapped by callers via `_(waterbody_name(…))`.
  'mkmaze.c': new Set(['drink', 'ice', 'pool of water', 'swamp', 'moat']),
  // role.c character-identity columns — displayed via `_(aligns[…].adj)` /
  // `_(genders[…].adj)` / `_(races[…].noun|.adj)` at char-creation + enlightenment
  // sites; the SAME fields are strncmpi-matched at role.c:1034/968/901 (raw,
  // English) for config parsing → display-vs-parse split at the use site. (aligns
  // .noun column law/balance/chaos is not displayed → left English.)
  'role.c': new Set(['lawful', 'neutral', 'chaotic', 'unaligned',
    'male', 'female', 'neuter',
    'human', 'elf', 'dwarf', 'gnome', 'orc',
    'elven', 'dwarvish', 'gnomish', 'orcish']),
  // options.c default_menu_cmd_info[].desc column — shown via `putstr(win, 0,
  // Sprintf("%-8s %s", key, _(…[i].desc)))` in the "Menu control keys:" help. The
  // sibling .name column (menu_first_page, …) is a strcmp-matched config key → left
  // English (still flagged; must stay English, not force-credited).
  'options.c': new Set(['Go to first page', 'Go to last page', 'Go to next page',
    'Go to previous page', 'Select all items', 'Unselect all items',
    'Invert selection', 'Select items in current page',
    'Unselect items in current page', 'Invert current page selection',
    'Search and toggle matching items',
    // paranoia[].explain descriptions, shown via `add_menu(…, _(paranoia[i].explain))`.
    // (The strncmpi-matched keyword columns — Confirm/quit/die/attack/… — stay English.)
    'for "yes" confirmations, require "no" to reject',
    'yes vs y to quit or to enter explore mode',
    'yes vs y to die (explore mode or debug mode)',
    'yes vs y to save bones data when dying in debug mode',
    'yes vs y to attack a peaceful monster',
    'yes vs y to break a wand via (a)pply',
    'yes vs y to continue eating after first bite when satiated',
    'yes vs y to change form when lycanthropy is controllable',
    'y to pray (supersedes old "prayconfirm" option)',
    'always pick from inventory for Remove and Takeoff',
    // msgtype_names[].descr via add_menu(_(descr)); action_titles[].desc via
    // Sprintf(_(desc)); the sibling config-keyword columns (show/hide/stop/…) stay English.
    'Show message normally', 'Hide message', 'Prompt for more after the message',
    'Do not repeat the message', 'add new %s', 'list %s', 'remove existing %s',
    'exit this menu',
    // othropt[].name shown via opts_add_others(_(name)); n_currently_set via
    // Sprintf(buf2, _(n_currently_set), …); paranoia end_menu title (direct wrap).
    'message types', 'status hilite rules', '(%d currently set)',
    // to_be_done[] option-value placeholder, shown via Sprintf(buf,"%s",_(to_be_done))
    // at many option branches; static-decl scalarWrapped miss (already catalogued).
    '(to be done)']),
  // decl.c c_common_strings shared message constants — accessed via macros that
  // expand to `_(c_common_strings.c_...)` (see include/decl.h:313), so every
  // `pline1(nothing_happens)` etc. renders zh. (Bare 'the'/'your'/'mon'/'you'
  // pronoun-pair members omitted — too common to credit safely by value.)
  'decl.c': new Set(['Nothing happens.', "That's enough tries!",
    'That is a silly thing to %s.', 'shudder for a moment.', 'something',
    'Something', 'You can move again.', 'Never mind.', 'vision quickly clears.',
    // c_color_names (NH_* macros) — shown via hcolor(), which now returns
    // `_(colorpref)` for the non-hallucination case.
    'black', 'amber', 'golden', 'light blue', 'red', 'green', 'silver', 'blue',
    'purple', 'white', 'orange']),
};
// role/race/gender FILE CODES in role.c (roles[].filecode, races[].filecode,
// genders[].filecode) — used for quest .lev filenames + save-file data; must
// stay English. The adjacent names/titles/pronouns in the same tables ARE display.
const ROLE_CODES = new Set(['Arc', 'Bar', 'Cav', 'Hea', 'Kni', 'Mon', 'Pri', 'Rog',
  'Ran', 'Sam', 'Tou', 'Val', 'Wiz', 'Hum', 'Elf', 'Dwa', 'Gno', 'Orc', 'Mal', 'Fem', 'Ntr',
  // alignment filecodes (aligns[].filecode) — quest/save filenames + strcmpi parse
  'Law', 'Neu', 'Cha', 'Una']);
// any *conf.h is a platform build-config header (all internal)
const isConfigHeader = base => /conf\.h$/.test(base);
// Per-file line ranges that are string-surgery / parse tables (plural/singular
// stems, compound separators) — real words but never shown as text. Everything
// else in these files (object/item names) is a displayed descriptor.
const PARSE_RANGES = {
  'objnam.c': [[2186, 2197], [2280, 2820]], // special_subjs[] (vtense/makesingular exceptions) + one_off[]/no_men[]/no_man[]/compounds[] in makeplural/makesingular/badman
  'engrave.c': [[29, 65]],    // rubouts[] wipe-to cipher chars + random-engraving character pools (scaffolding)
  'topten.c': [[270, 273], [595, 597], [759, 761], [1070, 1072]], // record-file gender/mode/eod/default-name codes
  'pickup.c': [[2632, 2634], [2888, 2890]], // menu accelerator/selector char strings
  'hacklib.c': [[333, 335], [358, 360]],    // vowel set + "ing" grammar-surgery fragments (shifted +7 by s_suffix zh-gate)
  'save_slots.c': [[30, 32], [514, 516]],   // save-slot filename token / "save" path
};

function inParseRange(base, line) {
  const ranges = PARSE_RANGES[base];
  return !!ranges && ranges.some(([a, b]) => line >= a && line <= b);
}
// line ranges whose display strings are wizard-mode-only debug dumps (never shown to
// a normal player), so not a translation surface.
const WIZARD_DEBUG_RANGES = {
  // timeout.c: kind_name()/print_queue()/wiz_timeout_queue() — the #wizintrinsic /
  // timeout-queue diagnostic dump; strings self-labelled "settable via #wizinstrinc only".
  'timeout.c': [[1731, 1912]],
  // teleport.c: dotelecmd() teleport-control mode menu (tports[].menudesc) — reached
  // only after `if (!wizard) return dotele()`, i.e. the wizard-mode ^T override picker.
  'teleport.c': [[596, 599]],
  // cmd.c: misc_stats()/wiz_show_stats() — the wizard-mode memory-usage report
  // (#wizwhere-adjacent "Current memory statistics:" dump: object/monster/overview sizes).
  // Plus the wizard-only base-36 levl-typ dump options in the #terrain menu (if(wizard)).
  // wiz_intrinsic() (if(wizard)): the #wizintrinsic toggle menu ("Which intrinsics?").
  'cmd.c': [[1064, 1099], [1382, 1512], [1564, 1570], [4041, 4244]],
  // mon.c: `if (wizard && iflags.mon_polycontrol)` poly-control prompt ("Change %s"/
  // " @ %s into what?"/" kind of monster?") — wizard-mode monster-poly debugging.
  'mon.c': [[3540, 3604]],
  // light.c wiz_light_sources() (WIZMODECMD, cmd.c:3412): the #wizlightsources debug
  // window ("Mobile light sources:"/column headers/obj/mon/<none>).
  'light.c': [[772, 812]],
  // end.c: paranoid_query(ParanoidBones, "Save bones?") reached only in wizard mode
  // (`if (!wizard || paranoid_query(...))` — non-wizard saves bones without asking).
  'end.c': [[1435, 1435]],
  // attrib.c: attribute-source annotation (" because of %s") — the whole block is
  // `if (wizard)` gated ("Restrict the source of the attributes just to debug mode").
  'attrib.c': [[825, 904]],
  // invent.c: the #wizidentify override-ID debug prompt block, `if (wizard &&
  // iflags.override_ID)` — "Debug Identify"/"select %s to permanently identify"/… .
  'invent.c': [[2686, 2714]],
  // dungeon.c: overview_stats() — mapseen memory sizes, called only from cmd.c's
  // wizard-only wiz_show_stats() ("general, size %ld"/"cemetery, size %ld"/…).
  // Plus print_dungeon()'s tail (after the bymenu/level-teleport path returns at
  // ~1941): floating-branch listing + the "-dean" invocation/portal-coord debug,
  // reached only via the wizard-only ^O/wiz_where command.
  'dungeon.c': [[1946, 2001], [2251, 2298]],
};
function inWizardDebugRange(base, line) {
  const ranges = WIZARD_DEBUG_RANGES[base];
  return !!ranges && ranges.some(([a, b]) => line >= a && line <= b);
}
// developer-diagnostic ranges: NH_DEVEL_STATUS-gated paniclog breadcrumb tracing,
// written to the panic log for debugging, never shown to players.
const DEV_DIAG_RANGES = {
  // ball.c: placebc/lift_covet_and_placebc/unplacebc breadcrumb assertions —
  // Sprintf(panicbuf, "placebc denied…") then paniclog(), all in #if !RELEASED.
  'ball.c': [[190, 345]],
  // mkobj.c: obj_sanity_check()/objlist_sanity()/mon_obj_sanity()/where_name()/
  // insane_object()/check_contained()/check_glob() — object-consistency diagnostics
  // ("%s obj %s %s: %s", "worn mask 0x…", where-enum names) fed to impossible().
  // sanity_check_worn() (2578-2768): the slot-name `what` strings ("primary weapon"/
  // "left ring"/"skin"/… and "worn mask 0x… != %s"/"worn (%s %s)") feed ONLY
  // insane_object() diagnostics — NOT player messages (the real player vocab is separate
  // full sentences: wield.c "switch to your primary weapon.", pray.c ring-glows).
  'mkobj.c': [[2270, 2575], [2578, 2768]],
  // display.c: show_glyph() glyph-category labels (text = "swallow border"/"zap beam"/
  // "ridden mon"/…) fed ONLY to impossible("show_glyph: bad pos … [%s %d]") at ~1552.
  'display.c': [[1513, 1552]],
};
function inDevDiagRange(base, line) {
  const ranges = DEV_DIAG_RANGES[base];
  return !!ranges && ranges.some(([a, b]) => line >= a && line <= b);
}
// Functions called ONLY by the classic windowports (win/tty, win/curses, win/gem) and
// never by WebHack's headless port. WebHack drives character creation from its React UI
// (win/headless: headless_player_selection applies JS-chosen options), so the tty
// player-selection prompt builders never run — their prose is not a WebHack surface.
const CLASSIC_WINPORT_RANGES = {
  // role.c: promptsep / root_+build_plselection_prompt / role_selection_prolog /
  // role_menu_extra — build the tty "Shall I pick a character's role…" prompt + the
  // interactive role/race/gender/alignment menu prolog & entries (verified: only
  // win/tty/wintty.c, win/curses/cursinit.c, win/gem/wingem.c call these).
  'role.c': [[1425, 1439], [1476, 1700], [1762, 1846], [1850, 1991]],
};
function inClassicWinportRange(base, line) {
  const ranges = CLASSIC_WINPORT_RANGES[base];
  return !!ranges && ranges.some(([a, b]) => line >= a && line <= b);
}
// classic-tty status-line text (condition abbreviations etc). WebHack's status bar is
// rendered by the React frontend from structured events with its own zh labels, so the
// generic-tty status builder's strings are never a player surface here (cf. botl.c TTY_ONLY).
const TTY_STATUS_RANGES = {
  // windows.c genl_status_update() BL_CONDITION block: " Stone"/" Slime"/" Blind"/…
  'windows.c': [[980, 1015]],
  // eat.c hu_stat[] hunger-state bottom-line texts ("Hungry  "/"Weak    "/… with fixed-
  // width padding) — the classic tty status line; WebHack's React status bar renders
  // hunger from structured events with its own zh labels (hutxt[] is the compare copy).
  'eat.c': [[75, 76]],
};
function inTtyStatusRange(base, line) {
  const ranges = TTY_STATUS_RANGES[base];
  return !!ranges && ranges.some(([a, b]) => line >= a && line <= b);
}
// machine-readable record/log-file serialization (field=value, tab-separated) written
// to disk and parsed by external tools — must stay ASCII/English, not a player surface.
const RECORD_FILE_RANGES = {
  // topten.c write_xlentry(): xlogfile fields "version=%d.%d.%d", "%cpoints=%ld…",
  // "%crole=%s%crace=%s…" Fprintf'd to rfile with XLOG_SEP tabs.
  'topten.c': [[349, 361]],
};
function inRecordFileRange(base, line) {
  const ranges = RECORD_FILE_RANGES[base];
  return !!ranges && ranges.some(([a, b]) => line >= a && line <= b);
}
// internal placeholder/template struct data overwritten at runtime, never displayed.
const INTERNAL_STRUCT_RANGES = {
  // role.c: `struct Role urole`/`struct Race urace` default templates — "Undefined"/
  // "Xxx" (filecode)/"home"/"locate" (quest-level ids)/"something", all munged by
  // role_init() from the real selection before anything is shown.
  'role.c': [[591, 599], [731, 736]],
};
function inInternalStructRange(base, line) {
  const ranges = INTERNAL_STRUCT_RANGES[base];
  return !!ranges && ranges.some(([a, b]) => line >= a && line <= b);
}

// Resolve what would otherwise be 'unclassified' to a best-effort verdict.
// Reason strings are written in plain Chinese (matching the dashboard) and are
// meant to be self-explanatory to a human reviewer: what it is + why + verdict.
function resolveUnknown(cx, value, base, line) {
  if (NONDISPLAY_FUNCS.has(cx)) return { label: 'excluded', reason: '作为参数传给 ' + cx + '()——该函数只做诊断/文件IO/配置解析，输出不会显示给玩家，无需翻译' };
  if (DISPLAY_FUNCS.has(cx)) return { label: 'untranslated', reason: '作为参数传给 ' + cx + '()，会拼进玩家可见的消息（死亡原因/菜单标题/物名拼装等）——需翻译' };
  if (isMessageLike(value)) return { label: 'untranslated', reason: '像一句话或短语的展示文本（含空格或 %s 之类格式占位；上下文=' + cx + '）——很可能显示给玩家，需翻译（待人工复核）' };
  // bare single token: decide by which file's data table it lives in
  if (DATA_TABLE_CTX.has(cx)) {
    if (INTERNAL_TABLE_FILES.has(base) || isConfigHeader(base)) return { label: 'excluded', reason: '位于 ' + base + ' 的内部数据表——选项名/控制字符/标识符/构建配置等关键字，供程序解析使用，不作为文本显示给玩家' };
    if (PROPER_NAME_FILES.has(base)) return { label: 'untranslated', reason: '位于 ' + base + ' 的专有名词表（店主/角色/神器等名字）——会显示给玩家，需音译或意译（待复核）' };
    if (DISPLAY_TABLE_FILES.has(base)) return { label: 'untranslated', reason: '位于 ' + base + ' 的描述词表（颜色/身体部位/伤害类型等单词）——会显示给玩家，需翻译（待复核）' };
  }
  return { label: 'unclassified', reason: '单个词，上下文=' + cx + '——无法判定是否会显示给玩家，如实标记为“未知”，未擅自归类' };
}

function hasLetters(s) {
  return /[A-Za-z]{2,}/.test(s.replace(/%[-+ 0-9.*#lhjzt$]*[a-zA-Z]/g, '').replace(/\\[ntr"]/g, ''));
}
function isPathLike(s) { return /^[\w./+-]+\.(h|c|txt|json|lev|des|dat)$/.test(s) || /^[A-Z][A-Z0-9_]{2,}$/.test(s); }
function maskComments(t) {
  const a = t.split(''); let i = 0;
  const bl = k => { if (a[k] !== '\n') a[k] = ' '; };
  while (i < t.length) {
    const c = t[i], n = t[i + 1];
    if (c === '"') { i++; while (i < t.length && t[i] !== '"') { if (t[i] === '\\') i++; i++; } i++; continue; }
    if (c === "'") { bl(i); i++; while (i < t.length && t[i] !== "'") { if (t[i] === '\\') { bl(i); i++; } bl(i); i++; } if (i < t.length) bl(i); i++; continue; }
    if (c === '/' && n === '/') { while (i < t.length && t[i] !== '\n') { bl(i); i++; } continue; }
    if (c === '/' && n === '*') { bl(i); bl(i + 1); i += 2; while (i < t.length && !(t[i] === '*' && t[i + 1] === '/')) { bl(i); i++; } if (i < t.length) { bl(i); bl(i + 1); i += 2; } continue; }
    i++;
  }
  return a.join('');
}
// build macros the WebHack (emscripten/UNIX) preprocessor leaves UNDEFINED, so any
// `#ifdef MACRO` / `#if defined(MACRO)` block gated solely on one of them is dead.
// DUMPLOG: end-of-game text dumps — commented out in config.h, only ntconf.h (WIN)
// defines it; verified undefined via `emcc -E`. Its `#ifdef DUMPLOG` blocks (dumplog
// putstr headers/menus in end.c &c) never compile, so are not a translation surface.
const KNOWN_UNDEF_MACROS = new Set(['DUMPLOG', 'MAC']);
// (MAC: the old Macintosh port; undefined in the emscripten/UNIX build — verified via
// `emcc -E` — so all `#ifdef MAC` blocks are dead. Exact-match, so MACOSX/MAC_* untouched.)
// Blank out lines inside dead preprocessor branches — `#if 0`/`#if FALSE`, the
// `#ifdef`/`#if defined()` body of a KNOWN_UNDEF macro, and the `#else` of an
// `#ifndef KNOWN_UNDEF` — none of which the compiler sees, so their literals aren't a
// translation surface. Length-preserving (dead lines -> spaces, newlines kept). Uses a
// frame stack so both polarities and nesting resolve correctly; branches whose
// condition we can't evaluate (ordinary macros) are assumed LIVE, i.e. never masked.
function maskDeadCode(t) {
  const lines = t.split('\n');
  const stack = []; // { ownDead, parentDead, evaluated }
  const anyDead = () => stack.some((f) => f.ownDead || f.parentDead);
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const m = L.match(/^\s*#\s*(if|ifdef|ifndef|else|elif|endif)\b\s*(.*)$/);
    if (m) {
      const d = m[1], cond = m[2];
      if (d === 'if' || d === 'ifdef' || d === 'ifndef') {
        const parentDead = anyDead();
        const defMatch = cond.match(/^\s*defined\s*\(\s*([A-Za-z_]\w*)\s*\)\s*$/);
        let ownDead = false, evaluated = false;
        if (d === 'if' && /^\s*(0|FALSE)\b/.test(cond)) { ownDead = true; evaluated = true; }
        else if (d === 'ifdef' && KNOWN_UNDEF_MACROS.has(cond.trim())) { ownDead = true; evaluated = true; }
        else if (d === 'ifndef' && KNOWN_UNDEF_MACROS.has(cond.trim())) { ownDead = false; evaluated = true; }
        else if (d === 'if' && defMatch && KNOWN_UNDEF_MACROS.has(defMatch[1])) { ownDead = true; evaluated = true; }
        stack.push({ ownDead, parentDead, evaluated });
      } else if (d === 'endif') {
        stack.pop();
      } else if (d === 'else' || d === 'elif') {
        const top = stack[stack.length - 1];
        if (top && top.evaluated) top.ownDead = !top.ownDead;
      }
      lines[i] = ' '.repeat(L.length); // directive lines carry no translatable literals
      continue;
    }
    if (anyDead()) lines[i] = ' '.repeat(L.length);
  }
  return lines.join('\n');
}
function lineOf(text, idx) { let n = 1; for (let i = 0; i < idx; i++) if (text[i] === '\n') n++; return n; }
// literal used as `sizeof "str"` / `sizeof("str")` — a compile-time length for buffer
// sizing / column math, never a displayed string.
function isSizeofArg(masked, startIdx) {
  let b = startIdx - 1;
  while (b >= 0 && /\s/.test(masked[b])) b--;
  if (masked[b] === '(') { b--; while (b >= 0 && /\s/.test(masked[b])) b--; }
  return /\bsizeof$/.test(masked.slice(Math.max(0, b - 7), b + 1));
}
// objnam.c `cnoun ? cnoun : "wand"` — the English class-noun fallback is reached only
// when nhi18n_objclass_noun() returns NULL (non-zh); for zh it always returns the
// localized noun (魔杖/戒指/…), so these English fallbacks never render in zh.
function isCnounFallback(masked, startIdx) {
  const pre = masked.slice(Math.max(0, startIdx - 200), startIdx);
  // `cnoun ? cnoun : "wand"` — simple English class-noun fallback.
  if (/cnoun\s*\?\s*cnoun\s*:\s*$/.test(pre)) return true;
  // `cnoun ? Sprintf(buf,"%s%s",…zh…) : (void) Sprintf(buf, "wand of %s", …)` — the
  // English "X of %s"/"%s X" template is the else-branch, reached only when cnoun==NULL.
  if (/cnoun\s*\?[\s\S]*?:\s*(\(\s*void\s*\)\s*)?(Sprintf|Strcpy|Strcat)\s*\(\s*\w+\s*,\s*$/.test(pre))
    return true;
  // if-else form: `if (cnoun) Sprintf(…zh…); else Sprintf(eos(buf), " of %s", …)` — the
  // English template in the else-branch is unreachable for zh (cnoun!=NULL there).
  if (/\bcnoun\b[\s\S]{0,150}?\belse\b\s*\{?\s*(\(\s*void\s*\)\s*)?(Sprintf|Strcpy|Strcat)\s*\(\s*(eos\s*\(\s*)?\w+\b[\s\S]{0,10}?,\s*$/.test(pre))
    return true;
  // GEM_CLASS `zh ? "石头" : "stone"` idiom (zh = !nhi18n_uses_articles()): the English
  // is the `:` else-branch, dead for zh. Inline zh strings avoid the terrain-stone homograph.
  if (/\bzh\s*\?[\s\S]{0,40}?:\s*$/.test(pre)) return true;
  // `if (nhi18n_uses_articles()) Sprintf(buf, "set of %s", …)` — article-language-only
  // branch (dragon-scale "set of"); never taken for zh.
  if (/if\s*\(\s*nhi18n_uses_articles\(\)\s*\)\s*\{?\s*(\(\s*void\s*\)\s*)?(Sprintf|Strcpy|Strcat)\s*\(\s*\w+\s*,\s*$/.test(pre))
    return true;
  // `if (!nhi18n_uses_articles()) Sprintf(_(zh)…); else Sprintf(eos(buf), " of %s%s", …)`
  // — the else is the article-language (English) branch; figurine/statue "of" templates.
  if (/!\s*nhi18n_uses_articles\(\)[\s\S]{0,120}?\belse\b\s*\{?\s*(\(\s*void\s*\)\s*)?(Sprintf|Strcpy|Strcat)\s*\(\s*(eos\s*\(\s*)?\w+\b[\s\S]{0,10}?,\s*$/.test(pre))
    return true;
  return false;
}

// extract every literal, joining C adjacent concatenation "a" "b" -> "ab"
function extractLiterals(masked) {
  const out = [];
  let i = 0;
  while (i < masked.length) {
    if (masked[i] !== '"') { i++; continue; }
    const startIdx = i;
    let value = '';
    // read one-or-more adjacent literals
    for (;;) {
      i++; // past opening "
      while (i < masked.length && masked[i] !== '"') { if (masked[i] === '\\') { value += masked[i] + (masked[i + 1] || ''); i += 2; } else { value += masked[i]; i++; } }
      i++; // past closing "
      let k = i; while (k < masked.length && /\s/.test(masked[k])) k++;
      if (masked[k] === '"') { i = k; continue; }
      break;
    }
    out.push({ value, startIdx });
  }
  return out;
}
// is the literal at startIdx directly wrapped as _( ... )? look back for _(
function isWrapped(masked, startIdx) {
  let b = startIdx - 1; while (b >= 0 && /\s/.test(masked[b])) b--;
  return b >= 1 && masked[b] === '(' && masked[b - 1] === '_';
}
// nearest enclosing call name (identifier immediately before an unclosed '(')
function contextOf(masked, startIdx) {
  // walk backwards tracking paren depth to find the call that contains us
  let depth = 0;
  for (let i = startIdx - 1; i >= 0 && startIdx - i < 600; i--) {
    const c = masked[i];
    if (c === ')') depth++;
    else if (c === '(') {
      if (depth === 0) {
        // identifier before this (
        let e = i - 1; while (e >= 0 && /\s/.test(masked[e])) e--;
        let s = e; while (s >= 0 && /[A-Za-z0-9_]/.test(masked[s])) s--;
        const id = masked.slice(s + 1, e + 1);
        if (id) return id;
        return '(paren)';
      }
      depth--;
    }
  }
  // not in a call — check for return / = / {  / #define / #include
  const pre = masked.slice(Math.max(0, startIdx - 40), startIdx);
  if (/\breturn\s*(_\(\s*)?$/.test(pre)) return 'return';
  if (/#\s*include\s*$/.test(pre)) return '#include';
  if (/#\s*define\s+\w+\s*(_\(\s*)?$/.test(pre)) return '#define';
  if (/[{,]\s*(_\(\s*)?$/.test(pre)) return 'array/struct-init';
  if (/=\s*(_\(\s*)?$/.test(pre)) return 'assignment';
  return '(other)';
}

function collectCmp(masked) {
  const set = new Set();
  let m; CMP_RE.lastIndex = 0;
  while ((m = CMP_RE.exec(masked)) !== null) {
    // read literals inside this call (shallow)
    let i = m.index + m[0].length - 1, depth = 0;
    for (; i < masked.length; i++) {
      const c = masked[i];
      if (c === '"') { let v = '', j = i + 1; while (j < masked.length && masked[j] !== '"') { if (masked[j] === '\\') { v += masked[j] + (masked[j + 1] || ''); j += 2; } else { v += masked[j]; j++; } } set.add(v); i = j; }
      else if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) break; }
    }
  }
  return set;
}

function compiledFiles() {
  // parse the exact .c list from the build script; add all include/*.h
  const files = [];
  try {
    const bld = fs.readFileSync(path.join(repoRoot, 'scripts', 'build_wasm_simple.cmd'), 'utf8');
    for (const m of bld.matchAll(/\b((?:src|win|sys)\/[\w/]+\.c)\b/g)) files.push(m[1]);
  } catch { /* fallback below */ }
  if (!files.length) for (const f of fs.readdirSync(path.join(repoRoot, 'src'))) if (f.endsWith('.c')) files.push('src/' + f);
  const uniq = [...new Set(files)];
  // headers (compiled via #include) — include/ only (generated *.h skipped: catalog/names are data)
  const incDir = path.join(repoRoot, 'include');
  if (fs.existsSync(incDir)) for (const f of fs.readdirSync(incDir)) if (f.endsWith('.h')) uniq.push('include/' + f);
  return uniq.sort();
}

const SKIP_GENERATED = /nhi18n_catalog\.h$|nhi18n_(mon|obj)names\.h$|qt_xpms\.h$|vis_tab\.c$|tile\.c$/;

// Build the shared context ONCE: catalog + the global cross-file parse-coupled
// literal set. This is the only pass that must read every file; it is separated
// so the dashboard can then classify (and stream) one file at a time.
export function buildContext(lang = 'zh-CN') {
  const catPath = path.join(repoRoot, 'locales', lang, 'webhack.translations.json');
  let catalog = {}; try { catalog = JSON.parse(fs.readFileSync(catPath, 'utf8')); } catch {}
  const all = compiledFiles();
  const cmpLits = new Set();
  // Array/pointer variables that are translated at a USE SITE, e.g. `_(colors[i])`
  // or `_(foo)`. A static `const char *tbl[] = {...}` can't be _()-wrapped at its
  // declaration (non-constant initializer), so its strings are wrapped where the
  // table is read. We collect those names so the tracker can credit the table.
  // A static `const char *tbl[] = {...}` can't be _()-wrapped at its declaration
  // (non-constant initializer), so its strings are translated where the table is
  // READ. We credit a table if it is read through _() — either directly
  // `_(tbl[i])`, or INDIRECTLY through a pointer alias: `role = roles;` +
  // `_(role->rank[i].m)` (botl.c). Collect the pieces, then resolve.
  const declaredArrays = new Set();   // names with a `NAME[...] = {` initializer
  const wrappedBases = new Set();     // identifiers read as `_(id->|id.|id[`
  const scalarWrapped = new Set();    // identifiers read as `_(id)` (a plain char* var)
  const aliasPairs = [];              // [ptrVar, arrayName] from `ptr = array` / `ptr = &array[`
  const DECL_RE = /\b([A-Za-z_]\w*)\s*(?:\[[^\]\n]*\]\s*)+=\s*\{/g;
  const WRAP_BASE_RE = /_\(\s*([A-Za-z_]\w*)\s*(?:->|\.|\[)/g;
  const SCALAR_WRAP_RE = /_\(\s*([A-Za-z_]\w*)\s*\)/g;
  const ALIAS_RE = /\b([A-Za-z_]\w*)\s*=\s*&?\s*([A-Za-z_]\w*)\b/g;
  for (const rel of all) {
    const full = path.join(repoRoot, rel);
    if (!fs.existsSync(full)) continue;
    const masked = maskComments(maskDeadCode(fs.readFileSync(full, 'utf8')));
    for (const v of collectCmp(masked)) cmpLits.add(v);
    let m;
    DECL_RE.lastIndex = 0; while ((m = DECL_RE.exec(masked)) !== null) declaredArrays.add(m[1]);
    WRAP_BASE_RE.lastIndex = 0; while ((m = WRAP_BASE_RE.exec(masked)) !== null) wrappedBases.add(m[1]);
    SCALAR_WRAP_RE.lastIndex = 0; while ((m = SCALAR_WRAP_RE.exec(masked)) !== null) scalarWrapped.add(m[1]);
    ALIAS_RE.lastIndex = 0; while ((m = ALIAS_RE.exec(masked)) !== null) aliasPairs.push([m[1], m[2]]);
  }
  // A declared table array is display-wrapped if it (or a pointer aliased to it)
  // is read through _(). alias only counts when the RHS is itself a declared table.
  const wrappedArrays = new Set();
  for (const a of declaredArrays) if (wrappedBases.has(a)) wrappedArrays.add(a);
  for (const [ptr, arr] of aliasPairs)
    if (declaredArrays.has(arr) && wrappedBases.has(ptr)) wrappedArrays.add(arr);
  const files = all.filter(f => !SKIP_GENERATED.test(f));
  return { lang, catalog, cmpLits, wrappedArrays, scalarWrapped, files };
}

// LHS variable of an assignment `VAR = "literal"` — scan back from the literal
// past '=' to the identifier. Lets the tracker credit a scalar var wrapped at its
// use site (`var = "metal "` … `_(var)`).
function assignLHS(masked, startIdx) {
  let i = startIdx - 1;
  while (i >= 0 && /\s/.test(masked[i])) i--;
  if (masked[i] !== '=') return null;
  if (masked[i - 1] === '=' || masked[i - 1] === '!' || masked[i - 1] === '<'
      || masked[i - 1] === '>') return null; // ==, !=, <=, >= are comparisons
  i--;
  while (i >= 0 && /\s/.test(masked[i])) i--;
  let e = i;
  while (i >= 0 && /[A-Za-z0-9_]/.test(masked[i])) i--;
  const name = masked.slice(i + 1, e + 1);
  return name || null;
}

// Name of the array/pointer a table literal is declared in. Walk OUT through the
// enclosing braces (no fixed window — big tables like defsyms[MAXPCHARS] span
// thousands of chars) until we reach a `NAME[...] = {` initializer brace; return
// NAME. Lets the tracker tie a table string to its variable so use-site wrapping
// can be credited even for entries far from the declaration.
function arrayDeclName(masked, startIdx) {
  let depth = 0;
  for (let i = startIdx - 1; i >= 0; i--) {
    const c = masked[i];
    if (c === '"') { i--; while (i >= 0 && masked[i] !== '"') i--; continue; }
    if (c === '}') { depth++; continue; }
    if (c === '{') {
      if (depth > 0) { depth--; continue; }
      // an enclosing '{' — is it `NAME[...] = {` ?
      let e = i - 1; while (e >= 0 && /\s/.test(masked[e])) e--;
      if (masked[e] === '=') {
        let b = e - 1; while (b >= 0 && /\s/.test(masked[b])) b--;
        if (masked[b] === ']') {
          // skip one or more `[...]` dimension groups (handles 2D+ arrays)
          while (masked[b] === ']') {
            let d2 = 1; b--;
            while (b >= 0 && d2 > 0) { if (masked[b] === ']') d2++; else if (masked[b] === '[') d2--; b--; }
            while (b >= 0 && /\s/.test(masked[b])) b--;
          }
          let sname = b; while (sname >= 0 && /[A-Za-z0-9_]/.test(masked[sname])) sname--;
          const name = masked.slice(sname + 1, b + 1);
          if (name) return name;
        }
      }
      // nested struct/init brace, not the array decl — keep walking outward
    }
    else if (c === ';' && depth === 0) return null; // statement boundary
  }
  return null;
}

// Classify ONE file's literals using a prebuilt context. Cheap enough to call
// per-file so results can be streamed as they finish.
export function classifyFile(rel, ctx) {
  const full = path.join(repoRoot, rel);
  const rec = { path: rel, counts: { translated: 0, untranslated: 0, excluded: 0, unclassified: 0 }, lits: [] };
  if (!fs.existsSync(full)) return rec;
  const masked = maskComments(maskDeadCode(fs.readFileSync(full, 'utf8')));
  const base = rel.split('/').pop();
  for (const { value, startIdx } of extractLiterals(masked)) {
    const cx = contextOf(masked, startIdx);
    // wrapped if directly `_( "lit"` OR lexically inside a `_( ... )` call span
    // (e.g. a ternary branch `_(cond ? "a" : "b")`) — both translate at runtime.
    const wrapped = isWrapped(masked, startIdx) || cx === '_';
    const inCat = value in ctx.catalog;
    const line = lineOf(masked, startIdx);
    // enclosing static-array/table declaration name (null if not in one). Computed
    // for all contexts because table entries can appear via macros too — e.g.
    // artilist.h `A("Excalibur", …)` has context 'A', not 'array/struct-init'.
    const arrName = arrayDeclName(masked, startIdx);
    let label, reason = '';
    if (isPathLike(value)) { label = 'excluded'; reason = '文件名/路径或全大写宏常量——不是展示给玩家的文本'; }
    else if (!hasLetters(value)) { label = 'excluded'; reason = '无字母（纯格式符/标点/数字）——没有可翻译的内容'; }
    else if (DEV.has(cx)) { label = 'excluded'; reason = '开发/诊断输出（' + cx + '，即 impossible/panic/warning/debugpline 之类）——玩家看不到，无需翻译'; }
    else if (base === 'winheadless.c' && (/^\s*\{/.test(value) || value === '[FILE: %s]')) { label = 'excluded'; reason = 'headless 窗口端口发往 React 前端的 JSON 线协议模板（字段名/结构序列化，非展示文本）——前端解析后渲染其内容，模板本身玩家看不到'; }
    else if (isSizeofArg(masked, startIdx)) { label = 'excluded'; reason = 'sizeof "字面量" —— 编译期取字节长度用于缓冲/列宽计算，不是展示文本，须保留英文'; }
    else if (base === 'objnam.c' && isCnounFallback(masked, startIdx)) { label = 'excluded'; reason = 'objnam.c `cnoun ? cnoun : "英文"` 的英文兜底分支——中文下 nhi18n_objclass_noun() 始终返回本地化类名（魔杖/戒指/药水…），此英文分支在中文运行时永不到达'; }
    else if (cx === 'strsubst') { label = 'excluded'; reason = 'strsubst 查找/替换补丁（如 himself→yourself 人称改写、文件名/语法修正）——作用于英文原文的字符串手术，中文语境下不匹配、不适用，须保留英文'; }
    else if (TTY_ONLY.has(base)) { label = 'excluded'; reason = '经典 tty 窗口端口渲染（' + base + '：状态栏/genl_outrip 墓碑 ASCII 画等）——WebHack 由 winheadless→React 前端渲染，此 genl_ 版本不使用'; }
    else if (DEAD_CODE_FILES.has(base)) { label = 'excluded'; reason = '整个文件在 WebHack 构建中被预处理器排除（mail.c 全在 #ifdef MAIL 内，而构建定义了 -DNOMAIL，MAIL 未定义）——代码从不编译，文本永不显示'; }
    else if (NON_WASM_FILES.has(base)) { label = 'excluded'; reason = '平台专属源文件（' + base + '：DOS/WinCE 构建配置头或 UNIX 终端 tty/进程层）——WebHack 的 Emscripten 构建只编译 win/headless+sys/wasm，此文件从不参与编译，文本永不显示'; }
    else if (INTERNAL_VALUES_BY_FILE[base] && INTERNAL_VALUES_BY_FILE[base].has(value)) { label = 'excluded'; reason = '内部管道字符串（' + base + '：存档/配置文件路径、菜单加速键字符集等）——文件系统/UI 内部用途，非玩家展示文本'; }
    else if (BUILD_TOOL_FILES.has(base)) { label = 'excluded'; reason = '构建期工具的字符串（' + base + '：任务文本编译器的错误信息宏，运行时 questpgr.c 只用其常量、不引用这些错误宏）——从不编译进游戏，玩家看不到'; }
    else if (NAME_TABLE.has(base)) { label = 'excluded'; reason = '物品/怪物名称数据表——经名称目录（object/monster-names.json）翻译，不走这个消息目录'; }
    else if (arrName && (INTERNAL_ARRAYS.has(arrName) || (INTERNAL_ARRAYS_BY_FILE[base] && INTERNAL_ARRAYS_BY_FILE[base].has(arrName)))) { label = 'excluded'; reason = '位于内部表 ' + arrName + '[]（' + base + '）——解析/匹配用途（strncmpi 等按原文比较），须保留英文'; }
    else if (arrName && COMMAND_NAME_ARRAYS.has(arrName) && !/\s/.test(value)) { label = 'excluded'; reason = '命令名（玩家输入以调用命令 / 经 strstri 搜索）——须保留英文；同表的多词描述照常翻译'; }
    else if (base === 'role.c' && ROLE_CODES.has(value)) { label = 'excluded'; reason = '角色/种族/性别文件代码（用于任务关卡文件名与存档数据）——须保留英文'; }
    else if (wrapped && inCat) { label = 'translated'; }
    else if (wrapped && !inCat) { label = 'untranslated'; reason = '已用 _() 包裹（运行时会走翻译），但目录里还没有对应中文——待补充翻译'; }
    else if (cx === 'assignment' && inCat && ctx.scalarWrapped.has(assignLHS(masked, startIdx))) { label = 'translated'; }
    else if (arrName && (ctx.wrappedArrays.has(arrName) || (WRAPPED_ARRAYS_BY_FILE[base] && WRAPPED_ARRAYS_BY_FILE[base].has(arrName)))) {
      if (inCat) { label = 'translated'; }
      else { label = 'untranslated'; reason = '所在静态表已在使用处用 _(表名[...]) 包裹（运行时会翻译）——只差补充目录中文条目'; }
    }
    else if (DISPLAY_LITERALS_BY_FILE[base] && DISPLAY_LITERALS_BY_FILE[base].has(value)) {
      if (inCat) { label = 'translated'; }
      else { label = 'untranslated'; reason = '该字面量经指针在展示处用 _() 包裹（运行时会翻译）——只差补充目录中文条目'; }
    }
    else if (SELF_WRAP.has(cx)) {
      if (inCat) { label = 'translated'; }
      else { label = 'untranslated'; reason = '作为参数传给自包裹展示函数 ' + cx + '()（内部经 enlght_line 用 _() 包裹，运行时会翻译）——只差补充目录中文条目'; }
    }
    else if (inParseRange(base, line)) { label = 'excluded'; reason = '位于 ' + base + ' 的构词/复数处理表（makeplural/makesingular/词缀）——是拼字用的零件而非展示文本，须保留英文'; }
    else if (inWizardDebugRange(base, line)) { label = 'excluded'; reason = '巫师模式调试转储（' + base + ' 的 #wizintrinsic/timeout 队列诊断等）——普通玩家看不到，无需翻译'; }
    else if (inDevDiagRange(base, line)) { label = 'excluded'; reason = '开发者诊断（' + base + ' 的 paniclog 面包屑断言，受 NH_DEVEL_STATUS 门控，写入 panic 日志）——玩家看不到，无需翻译'; }
    else if (inClassicWinportRange(base, line)) { label = 'excluded'; reason = '仅经典窗口端口（win/tty、win/curses、win/gem）调用的角色选择提示构建函数（' + base + '）——WebHack 由 React 角色创建界面驱动（win/headless 的 headless_player_selection），这些 tty 提示从不运行'; }
    else if (inTtyStatusRange(base, line)) { label = 'excluded'; reason = '经典 tty 状态栏文本（' + base + ' 的 genl_status_update 状态位标签）——WebHack 状态栏由 React 前端按结构化事件渲染并自带中文标签，此处不显示'; }
    else if (inRecordFileRange(base, line)) { label = 'excluded'; reason = '机读记录/日志文件序列化（' + base + ' 的 xlogfile 字段 field=value，写入磁盘供外部工具解析）——须保留英文/ASCII，非玩家展示文本'; }
    else if (inInternalStructRange(base, line)) { label = 'excluded'; reason = '内部占位/模板结构默认值（' + base + ' 的 urole/urace 模板，运行时由 role_init() 用真实选择覆盖）——从不展示，须保留英文'; }
    else if (cx === 'array/struct-init' && arrayHasDisplaySibling(masked, startIdx, ctx.catalog)) { label = 'untranslated'; reason = '同一 {…} 数组里有别的条目是展示文本，故整张表判为展示——此单词也需翻译' + (inCat ? '（该文本目录中已有中文，但此处未用 _() 包裹，翻译暂不生效，需补包裹）' : ''); }
    else if (!wrapped && ctx.cmpLits.has(value)) { label = 'excluded'; reason = '程序在别处用 strcmp/strstri 等函数按这段英文原文做比较/查找来分支判断——若翻译它会导致匹配失败、逻辑出错，必须保留英文'; }
    else if (EMIT.has(cx)) { label = 'untranslated'; reason = '直接作为参数传给展示函数 ' + cx + '()（pline/putstr/菜单等），但未用 _() 包裹——需包裹并翻译' + (inCat ? '（该文本目录中已有中文，但此处未包裹，翻译暂不生效）' : ''); }
    else { const r = resolveUnknown(cx, value, base, line); label = r.label; reason = r.reason + (inCat ? '（注：该文本目录中已有中文）' : ''); }
    rec.counts[label]++;
    rec.lits.push({ line, text: value, wrapped, inCat, ctx: cx, label, reason, translation: (label === 'translated' ? ctx.catalog[value] : null) });
  }
  return rec;
}

export function computeLiteralSurface(lang = 'zh-CN') {
  const ctx = buildContext(lang);
  const out = { lang, scope: { files: ctx.files.length, note: 'compiled .c from build_wasm_simple.cmd + include/*.h; generated catalog/name/tile/pixmap files skipped' }, totals: { translated: 0, untranslated: 0, excluded: 0, unclassified: 0, total: 0 }, files: [] };
  for (const rel of ctx.files) {
    const rec = classifyFile(rel, ctx);
    if (!rec.lits.length) continue;
    for (const k of ['translated', 'untranslated', 'excluded', 'unclassified']) out.totals[k] += rec.counts[k];
    out.totals.total += rec.lits.length;
    out.files.push(rec);
  }
  out.files.sort((a, b) => (b.counts.untranslated + b.counts.unclassified) - (a.counts.untranslated + a.counts.unclassified) || a.path.localeCompare(b.path));
  return out;
}
