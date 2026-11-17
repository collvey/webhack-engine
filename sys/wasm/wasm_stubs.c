/* wasm_stubs.c - Stub implementations for WASM build */
/* These are platform-specific functions needed by the core */

#include "hack.h"
#include <ctype.h>

/* From unixmain.c - is the current player named in a sysconf user list?
 * Only the EXPLORERS gate of enter_explore_mode() calls this. There are no
 * Unix accounts in the browser, so "*" allows everyone (as upstream does)
 * and any other value is matched against the character name, as upstream
 * does with CHECK_PLNAME. Returning FALSE unconditionally made #exploremode
 * answer "You cannot access explore mode." for every player. */
boolean
check_user_string(char *optstr)
{
    int pwlen;
    char *eop, *w;

    if (!optstr || !*optstr)
        return FALSE;
    if (optstr[0] == '*')
        return TRUE; /* allow any user */
    if (!*plname)
        return FALSE;
    pwlen = (int) strlen(plname);
    eop = eos(optstr);
    w = optstr;
    while (w + pwlen <= eop) {
        if (!*w)
            break;
        if (isspace((uchar) *w)) {
            w++;
            continue;
        }
        if (!strncmp(w, plname, pwlen)
            && (!w[pwlen] || isspace((uchar) w[pwlen])))
            return TRUE;
        while (*w && !isspace((uchar) *w))
            w++;
    }
    return FALSE;
}

/* From unixmain.c - validate wizard mode access */
boolean
authorize_wizard_mode(void)
{
    /* In WASM single-player browser game, always allow wizard mode
     * There's no multi-user system to protect against */
    return TRUE;
}

/* From unixmain.c - set hangup handler */
void
sethanguphandler(void (*handler)(int))
{
    /* No-op in WASM - no signal handling needed */
    (void) handler;
}

/* From unixmain.c - show paths after options (NORETURN) */
void
after_opt_showpaths(const char *dir)
{
    /* In WASM, just exit after showing paths */
    raw_print(dir);
    nh_terminate(EXIT_SUCCESS);
}

/* From unixmain.c - get random seed from system */
unsigned long
sys_random_seed(void)
{
    /* Use JavaScript's Math.random() via time */
    /* In WASM, we can use emscripten's random */
    return (unsigned long) time((time_t *) 0);
}

/* From ioctl.c/unixtty.c - more pager function */
void
more(void)
{
    /* No-op in WASM - headless doesn't need paging */
}
