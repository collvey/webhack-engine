/* WebHack   nhi18n.h */
/* Internationalization (i18n) layer for WebHack. */
/* This file is WebHack-specific; it is not part of stock NetHack. */

/*
 * Design (see locales/README.md for the full plan):
 *
 *  - English is the SOURCE language and always the INTERNAL key language.
 *    Object names, monster names, wish parsing, and save files keep using
 *    English identifiers. Translation happens only at DISPLAY time. This is
 *    deliberately unlike NetHack-cn (which replaces literals in place and
 *    then has to patch strstr() comparisons); keeping English internal means
 *    wishing, naming, and save compatibility keep working untouched.
 *
 *  - Message format strings are wrapped in _() at their call sites, e.g.
 *        pline(_("You see here %s."), doname(otmp));
 *    The English string is the catalog key; a missing entry falls back to
 *    English, so the game is always playable at every stage of translation.
 *
 *  - Static name tables (objects[], mons[], roles[]) can't call a function
 *    in their initializers, so their strings are marked with N_() and looked
 *    up with _() at point of use (e.g. inside xname()/objnam.c).
 *
 *  - Runtime English grammar (a/an/the, plurals, verb tense) is assembled in
 *    objnam.c / hacklib.c / do_name.c. Languages such as Chinese have none of
 *    it, so grammar helpers consult nhi18n_uses_articles()/_plurals() and skip
 *    the English-only affixes instead of emitting literal "a"/"the"/"s".
 *
 * NOTE: this header defines the gettext-style macro `_`. Following the usual
 * gettext discipline, it is included LAST in hack.h so it does not shadow any
 * `_` used by system headers (those are pulled in earlier via config.h).
 */

#ifndef NHI18N_H
#define NHI18N_H

/* Supported languages. LANG_EN must stay 0 (the default / no-op state). */
enum nh_language {
    LANG_EN = 0,   /* English  - source / reference / fallback */
    LANG_ZH_CN,    /* Simplified Chinese (zh-CN) */
    NUM_LANGUAGES
};

/* Active UI language. Defaults to LANG_EN, so until a catalog is loaded and
   the language is switched, every lookup returns its input unchanged and the
   game behaves exactly as before. */
extern int nhi18n_language;

/* Core lookup: return the translation of `msgid` for the current language,
   or `msgid` itself when there is no entry (or language is LANG_EN). The
   returned pointer is owned by the catalog; never free it, never NULL. */
extern const char *nhi18n_gettext(const char *);

/* Context-qualified lookup: disambiguates identical English strings needing
   different translations (e.g. the verb "close" vs. the adjective). `ctx` is
   a short ASCII tag and is never shown to the user. */
extern const char *nhi18n_pgettext(const char *, const char *);

/* Translate an assembled-message PREFIX (e.g. "You ", "Your ", "The ") used by
   pline.c's You()/Your()/pline_The()/... helpers. Returns the localized prefix
   ONLY when the accompanying `line` is itself translated (detected as containing
   non-ASCII/UTF-8 bytes); otherwise returns `en` unchanged, so an untranslated
   English line keeps its English prefix rather than mixing scripts. */
extern const char *nhi18n_prefix(const char *, const char *);

/* Grammar gates for objnam.c / hacklib.c / do_name.c. Return 1/0 (int, not
   NetHack's boolean, so this header has no dependency on the config chain). */
extern int nhi18n_uses_articles(void); /* 0 for zh-CN: skip a/an/the       */
extern int nhi18n_uses_plurals(void);  /* 0 for zh-CN: skip English plurals */

/* Translate a monster's base name by its PM_* index (monsndx()). Returns the
   localized name for the active language, or NULL when untranslated / English
   (caller keeps the stock mons[].mname). Display-path only: internal naming,
   wishing, and saves keep the English name. */
extern const char *nhi18n_monname(int);

/* Translate an object's base name (OBJ_NAME) by its otyp. Returns the localized
   name for the active language, or NULL when untranslated / English. Display
   path only; internal naming, wishing, and saves keep the English name. Only
   direct-name classes (weapon/armor/food/gem) are translated so far. */
extern const char *nhi18n_objname(int);

/* Localized class noun for the "X of Y" object classes (ring/wand/scroll/potion/
   amulet/spellbook). Lets callers compose "<effect><noun>" (e.g. Chinese
   "保护戒指") instead of "ring of <effect>". Returns NULL when the active language
   uses English "of" composition. */
extern const char *nhi18n_objclass_noun(int);

/* Load the compiled catalog for `lang` (see locales/). Returns 1 on success,
   0 if unavailable (in which case that language falls back to English). */
extern int nhi18n_load_catalog(int);

/* Set the active language, loading its catalog on first use. */
extern void nhi18n_set_language(int);

/*
 * Call-site macros.
 *
 *   _(s)       runtime-translate a user-facing string literal.
 *              e.g.  You(_("feel much better."));
 *
 *   N_(s)      mark-only for extraction; expands to `s` unchanged. Use in
 *              static initializers where a call is impossible; translate at
 *              point of use with _().
 *
 *   NC_(c, s)  context-qualified runtime translate (see nhi18n_pgettext).
 *
 * The string extractor (locales/README.md) is configured to harvest all
 * three: xgettext --keyword=_ --keyword=NC_:2 --keyword=N_
 */
#define _(s) nhi18n_gettext(s)
#define N_(s) (s)
#define NC_(c, s) nhi18n_pgettext((c), (s))

#endif /* NHI18N_H */
