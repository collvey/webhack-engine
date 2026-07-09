# WebHack localization (i18n / l10n)

This directory is the **single home for all translatable text** in WebHack.
Translators work here and nowhere else.

```
locales/
  README.md              <- you are here (workflow + architecture)
  webhack.pot            <- generated template: every English game string (C backend)
  frontend.pot           <- generated template: every English UI string (React)
  en/                    <- source language, for reference/diffing
  zh-CN/
    webhack.po           <- game text (C backend) -> Chinese     [translators edit]
    frontend.json        <- UI chrome (React)     -> Chinese     [translators edit]
  <next-lang>/ ...
```

Two separate string worlds feed two separate catalogs per language:

| Catalog | Source of strings | Rendered by | Format |
|---|---|---|---|
| `webhack.po` | C backend: `pline()`, `You()`, menus, prompts, object/monster names | NetHack (WASM) → JSON `MESSAGE`/menu events → `MessageLog.tsx` | gettext `.po` |
| `frontend.json` | React UI: modals, buttons, tooltips, `src/data/*.ts` | React components via `react-i18next` | JSON |

---

## Golden rule: English stays internal; translate at display time

We do **not** replace English literals in place (the approach `NetHack-cn`
took). English is the internal key language: object/monster names, wish
parsing, and save files keep using English identifiers, so wishing, naming,
and save compatibility keep working. A missing translation always falls back
to English, so the game is playable at every stage of the effort.

---

## C backend workflow (`webhack.po`)

The seam is already in place (`include/nhi18n.h`, `src/nhi18n.c`):

- `_("...")` wraps a user-facing string at its call site — it is the catalog
  lookup. English string = catalog key.
- `N_("...")` marks a string in a static table (e.g. `objects[]`) that can't
  call a function; translate it at point of use with `_()`.
- `NC_("ctx", "...")` disambiguates identical English strings.

### 1. Wrap call sites (Phase 2)
```c
/* before */  You("feel much better.");
/* after  */  You(_("feel much better."));
```

### 2. Extract the template
```sh
# from repo root
xgettext --from-code=UTF-8 \
  --keyword=_ --keyword=NC_:1c,2 --keyword=N_ \
  --keyword=You --keyword=Your --keyword=pline --keyword=verbalize \
  -o locales/webhack.pot \
  src/*.c win/headless/*.c
```

### 3. Create/update a language
```sh
msginit  --input=locales/webhack.pot --locale=zh_CN -o locales/zh-CN/webhack.po   # first time
msgmerge --update locales/zh-CN/webhack.po locales/webhack.pot                     # later updates
```
Translators then edit `locales/zh-CN/webhack.po` (Poedit / Weblate / Crowdin
all understand this format).

### 4. Compile & load at runtime
Full `libintl`/`.mo` under Emscripten is flaky, so we compile the catalog to a
compact JSON the runtime loads. `scripts/i18n/compile-catalog.mjs` emits
`webhack-client/public/data/nethack-messages.<lang>.json` — a flat
`{ msgid: msgstr }` map (keys are the English msgids with C escapes, exactly what
the C runtime passes to `nhi18n_gettext`). Already generated for zh-CN (4098
entries, ~244 KB).

Remaining wiring (needs `emcc` — verify with a build, don't do blind):
`nhi18n_load_catalog(lang)` reads that JSON (fetch it into the Emscripten FS in
the worker glue, then `fopen`/parse in C, or preload with `--preload-file`), fills
a hash keyed by msgid; `nhi18n_lookup()` does the hash lookup. The entry points
are already stubbed in `src/nhi18n.c`. Because English msgids are the keys and
`nhi18n_gettext` falls back to its input, the game stays fully playable while the
catalog loads or for any untranslated string.

**End-to-end pipeline (all data-only, no build):**
`extract-c-strings.mjs` → `webhack.pot` + `webhack.corpus.json` →
translate into `<lang>/webhack.translations.json` (`next-batch.mjs` → agents →
`merge-batch.mjs` with a printf-specifier integrity gate) → `gen-po.mjs`
(`<lang>/webhack.po`) → `compile-catalog.mjs` (runtime JSON artifact).

---

## Frontend workflow (`frontend.json`)

`react-i18next` is initialized in `webhack-client/src/i18n/index.ts`. UI strings
live in `locales/<lang>/frontend.json` (the canonical, single source of truth).
The client imports these directly via the **`@locales` alias** — configured in
`webhack-client/vite.config.ts` (`resolve.alias` + `server.fs.allow: ['..']`) and
`tsconfig.json` (`paths`). There is **no** copy/sync step; edits to
`locales/<lang>/frontend.json` are picked up on the next dev reload / build.

In components: `const { t } = useTranslation()` then `t('namespace.key')`; for
strings with embedded markup use `<Trans i18nKey="…">`. Switch language with
`setLanguage()` from `src/i18n` (persists to `localStorage`, key `webhack.lang`).

Current coverage: **729 keys across 34 namespaces** — the frontend is fully
localized. Includes: landing, settings (two language switchers), message log,
tutorial (chrome + full step prose), credits, character creation (names +
descriptions + tips), save/load, command reference, symbol legend, top-right
controls, command drawer, option/menu panels, beginner tips, mobile UI, status
bars + stat tooltips, inventory (panel, paper-doll slots, context menu),
map & item hover tooltips (`tileInfo` + `tooltip`), danger labels, role tooltips,
monster detail view, logger control, minimap legend, quick-action bar, map-tile
context menu, guidance overlay/canvas text, and shared strings (`common`).

### The shared reload event

Several data overlays (below) load asynchronously and re-load on language change.
When any of them finishes (re)loading it dispatches `window` event
**`webhack:i18n-data-loaded`**. Consumers that build derived structures — notably
`SymbolGroupService` (rebuilds its groups) and `SymbolLegend` (bumps a
`dataVersion` state to recompute memoized lists) — listen for it. Firing the event
*after* the maps are populated (not merely on `languageChanged`) avoids a
stale-read race, and every lookup falls back to English so nothing ever breaks.

---

## Frontend game data: nomenclature vs. help text

The client has two kinds of game-domain text, handled differently:

1. **Canonical nomenclature** — monster/object/terrain/role NAMES. These live in
   auto-generated / canonical data (`src/data/NetHackData.ts` from the C headers,
   `public/data/roles.json`, etc.) and **must stay consistent with the C backend**.
   They are translated via a shared nomenclature catalog keyed by `internalName`
   (e.g. `PM_GIANT_ANT`) in `public/data/<kind>-names.<lang>.json`, loaded by
   `src/i18n/nomenclature.ts` (English fallback; reloads on language change). The
   client currently ships a **first-pass** machine translation of these names;
   because the catalog is keyed by `internalName`, a later NetHack-cn harvest just
   refines the *values* in place (same file, same keys), and the C backend can read
   the very same catalog — so the same Chinese name appears in HUD, tooltips, and
   in-game messages. Done: `monster-names.zh-CN.json` (381 monsters), wired into
   the hover tooltip via `TileInfoService`. Object/terrain names for the *tooltip*
   path are shown as generic categories (unidentified), so specific object/terrain
   names are covered instead through the Symbol Legend entity overlay (below).

2. **Frontend-authored help text** — the descriptions/tips shown in tooltips and the
   Symbol Legend, stored in `public/data/*-knowledge.json`. This is client help copy,
   not canonical NetHack strings, so it is safe to translate here.

### Knowledge-file localization mechanism

`src/data/GameplayKnowledge.ts` loads `public/data/<name>-knowledge.json` (English,
source of truth) and, when the UI language is not `en`, overlays
`public/data/<name>-knowledge.<lang>.json` if present. Merge is per-entry AND
per-field, so a partial translation degrades gracefully (any missing
description/tips/danger falls back to English). It reloads on `languageChanged`.

To translate a knowledge file for a language, add `<name>-knowledge.<lang>.json`
containing only the translated fields (e.g. `description` + `tips`; leave `danger`
out — it falls back to the English enum, which code compares against). Examples:
`terrain-knowledge.zh-CN.json` (44 entries), `monster-knowledge.zh-CN.json` (381).

### Symbol Legend localization

The Symbol Legend has two more overlays, both firing `webhack:i18n-data-loaded`:

- **Symbol group labels** — `src/data/symbolsData.ts` loads `symbols.json` (English
  base) and overlays `public/data/symbols.<lang>.json` (category → char →
  `{name?, description?}`) when the language isn't `en`. Example:
  `symbols.zh-CN.json` (92 group labels).
- **Static entity names/descriptions** (Player / Pet / Special / Terrain / Items) —
  `SymbolGroupService` loads `public/data/symbol-entities.<lang>.json`, keyed by
  `"<Category>:<id>"` → `{name?, description?}`. Example: `symbol-entities.zh-CN.json`
  (494 entries incl. 420 items). Monster entities in the legend instead reuse the
  monster nomenclature catalog + the knowledge overlay.

Entities carry both `name` (English, kept stable for lookups/keys) and
`displayName` (localized, shown in the UI) — never translate `name` in place, or
name-based lookups (`getMonsterByName`, colors) break. This is the same
"English-stays-internal" rule as the C backend.

## Summary of zh-CN data files

| File | What | Count |
|---|---|---|
| `locales/zh-CN/frontend.json` | React UI catalog | 729 keys |
| `public/data/monster-names.zh-CN.json` | monster nomenclature (by `internalName`) | 381 |
| `public/data/monster-knowledge.zh-CN.json` | monster help text | 381 |
| `public/data/terrain-knowledge.zh-CN.json` | terrain help text | 44 |
| `public/data/symbols.zh-CN.json` | symbol group labels | 92 |
| `public/data/symbol-entities.zh-CN.json` | legend entity names/descs | 494 |
| `public/data/game-terms.zh-CN.json` | role-tooltip terms (skills/intrinsics/items) | 102 |
| `locales/zh-CN/webhack.po` | C backend game text (first-pass) | 4098 (100%) |

## Handling English grammar (the hard part)

NetHack assembles English at runtime — articles (a/an/the), plurals, and verb
tense — in `objnam.c`, `hacklib.c`, `do_name.c`. Chinese has none of this, so
those helpers consult the gates in `nhi18n.c`:

- `nhi18n_uses_articles()` → 0 for zh-CN: skip emitting `a`/`an`/`the`
- `nhi18n_uses_plurals()` → 0 for zh-CN: skip the English `-s` plural

For gendered/declined languages (Romance, Slavic, German) a real per-language
morphology layer is needed instead; that is deferred until such a language is
targeted.

---

## Reusing NetHack-cn's translations

`ref/NetHack-Android-master/` is only the Android windowport overlay — the actual
Chinese strings live in the separate repo `github.com/SunnyYuer/NetHack-cn`, where
they are edited in-place in the C source. To harvest them cleanly:

1. Clone `NetHack-cn` and the matching stock NetHack 3.6.x it forked from.
2. Diff them to recover English→Chinese string pairs.
3. Import the pairs as `msgstr` values into `locales/zh-CN/webhack.po` (keyed by
   the English `msgid`), giving us their translation *data* without adopting
   their in-place mechanism.

---

## Roadmap

- **Phase 0 (done):** seams — `nhi18n.h/.c`, build wiring, this `locales/` tree,
  `react-i18next` bootstrap. No behavior change.
- **Phase 1 (done):** the ENTIRE frontend — UI chrome, character creation, tutorial,
  status bars, map/item tooltips, Symbol Legend (group labels + all entity
  categories), monster detail view, inventory, quick-action bar, minimap, context
  menus, guidance overlays, and the logger control — plus first-pass monster/entity
  nomenclature and role-tooltip game terms. A completeness audit confirmed no
  remaining hardcoded user-facing strings. Everything is build-verified (`tsc` +
  `vite build`) with full en/zh-CN key parity and English fallback throughout.
  (`src/components/StatusBar.tsx` is dead code — superseded by `StatusBars.tsx` —
  and should be deleted rather than translated.)
- **Live in-game text** (identified item/monster names and messages in the message
  log, menus, and prompts) originates in the C backend, so it is covered by Phase 2,
  not the frontend catalog.
- **Phase 2 — extraction + translation DONE (data-only, no build yet):**
  `scripts/i18n/extract-c-strings.mjs` scans the C source and produced
  `locales/webhack.pot` + `webhack.corpus.json` (**4098** distinct message format
  strings). All 4098 have a **first-pass** Simplified Chinese translation in
  `locales/zh-CN/webhack.translations.json` → compiled to `zh-CN/webhack.po`
  (100%), every entry `printf`-specifier-verified (same specifiers, same order,
  no positional forms). Pipeline scripts: `extract-c-strings.mjs`, `next-batch.mjs`,
  `merge-batch.mjs` (integrity gate), `gen-po.mjs`.
  **Remaining (needs `emcc` to verify — do NOT do blind):** (a) wrap the message
  call sites in `_()`; (b) implement `nhi18n_lookup()` in `src/nhi18n.c` to load a
  compiled form of `webhack.po` (generated C table or JSON via Emscripten FS);
  (c) build and play-test. Reuse the `internalName`-keyed nomenclature files so
  backend names match the frontend.
- **Phase 3:** static C tables (objects/monsters/roles) via `_()` at point of use.
- **Phase 4:** grammar gates in `objnam.c`/`hacklib.c`/`do_name.c` for zh-CN.
- **NetHack-cn harvest (any time):** refine the first-pass names/values (see below).
