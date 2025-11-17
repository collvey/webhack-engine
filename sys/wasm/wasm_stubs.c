/* wasm_stubs.c - Stub implementations for WASM build */
/* These are platform-specific functions needed by the core */

#include "hack.h"

/* From unixmain.c - check if user string is safe */
boolean
check_user_string(char *optstr)
{
    /* In WASM, we don't have shell access, so always return FALSE */
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
