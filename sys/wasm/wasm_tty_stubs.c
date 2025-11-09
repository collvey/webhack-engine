/* wasm_tty_stubs.c - TTY stubs for WASM headless build */

#include "hack.h"

/* TTY stub data structures */
struct window_procs tty_procs = { "-ttystubs" };

#ifdef CURSES_GRAPHICS
char erase_char, kill_char;
#endif

/* TTY initialization stub */
void
win_tty_init(int dir)
{
    /* No-op for WASM headless */
    (void) dir;
}
