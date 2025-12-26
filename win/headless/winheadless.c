/* NetHack 3.6 -- winheadless.c */
/* Headless window port for JSON protocol over stdio/WebSocket */

#include "hack.h"
#include "dlb.h"
#include "func_tab.h"  /* For extcmdlist[] */

#ifdef HEADLESS

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <ctype.h>
#include <errno.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

/* ========================================================================
 * GLOBALS & STATE
 * ======================================================================== */

static FILE *g_out = NULL;
static int g_next_req_id = 1;
static int g_initialized = 0;

/* M2: Map frame buffering */
#define MAP_ROWS 21
#define MAP_COLS 80

typedef struct {
    int glyph;      /* glyph at this position */
    int bkglyph;    /* background glyph */
    unsigned char dirty;  /* 1 if updated this frame */
} MapCell;

static MapCell g_map[MAP_ROWS][MAP_COLS];
static int g_cursor_x = 0;
static int g_cursor_y = 0;
static int g_map_dirty = 0;  /* 1 if map needs redraw */

/* M3: Menu state */
#define MAX_MENU_ITEMS 512

typedef struct {
    anything identifier;   /* item identifier (from game) */
    char text[512];        /* display text */
    char accel;            /* accelerator key ('a', 'b', etc.) */
    char group_accel;      /* group selector */
    int glyph;             /* glyph for rendering */
    int attr;              /* text attributes */
    boolean selectable;    /* can be selected? */
    boolean selected;      /* is selected? */
    long count;            /* count (for selection) */
} MenuItem;

typedef struct {
    int menu_id;
    winid window;
    MenuItem items[MAX_MENU_ITEMS];
    int item_count;
    char prompt[512];
    int how;               /* PICK_NONE, PICK_ONE, PICK_ANY */
    boolean active;
} MenuState;

static MenuState g_menu = {0};
static int g_next_menu_id = 1;

/* M4: Status field cache */
typedef struct {
    char title[256];       /* Character name and title */
    char str[32];          /* Strength (can be "18/**") */
    char dex[32];          /* Dexterity */
    char con[32];          /* Constitution */
    char intel[32];        /* Intelligence */
    char wis[32];          /* Wisdom */
    char cha[32];          /* Charisma */
    char align[32];        /* Alignment */
    long gold;             /* Gold/money */
    int hp;
    int hpmax;
    int pw;
    int pwmax;
    int ac;
    int xlvl;
    int dlvl;
    long exp;
    int enc;
    int hunger;            /* Hunger level */
    unsigned long cond;
    long turn;
    long score;            /* Score */
} StatusCache;

static StatusCache g_status = {0};

/* ========================================================================
 * UTILITIES
 * ======================================================================== */

static long
now_ms(void)
{
    struct timespec ts;
#if defined(_WIN32)
    timespec_get(&ts, TIME_UTC);
#else
    clock_gettime(CLOCK_REALTIME, &ts);
#endif
    return (long)(ts.tv_sec * 1000L + ts.tv_nsec / 1000000L);
}

/* JSON string escaping (minimal - handle quotes, backslashes, newlines) */
static void
json_escape(const char *src, char *dst, size_t dstsz)
{
    size_t i = 0;
    while (*src && i + 2 < dstsz) {
        if (*src == '"' || *src == '\\') {
            dst[i++] = '\\';
            dst[i++] = *src++;
        } else if (*src == '\n') {
            dst[i++] = '\\';
            dst[i++] = 'n';
            src++;
        } else if (*src == '\r') {
            dst[i++] = '\\';
            dst[i++] = 'r';
            src++;
        } else if (*src == '\t') {
            dst[i++] = '\\';
            dst[i++] = 't';
            src++;
        } else {
            dst[i++] = *src++;
        }
    }
    dst[i] = '\0';
}

/* ========================================================================
 * OUTPUT: EVENTS
 * ======================================================================== */

static void
emit_event(const char *kind, const char *json_data)
{
    long ts = now_ms();
    if (!g_out) g_out = stdout;
    
    if (json_data && *json_data) {
        fprintf(g_out, "{\"v\":1,\"type\":\"EVENT\",\"kind\":\"%s\",\"ts\":%ld,\"data\":%s}\n",
                kind, ts, json_data);
    } else {
        fprintf(g_out, "{\"v\":1,\"type\":\"EVENT\",\"kind\":\"%s\",\"ts\":%ld}\n",
                kind, ts);
    }
    fflush(g_out);
}

static void
emit_message(const char *text, const char *style)
{
    char escaped[8192];
    json_escape(text, escaped, sizeof(escaped));
    
    char buf[16384];
    snprintf(buf, sizeof(buf), "{\"text\":\"%s\",\"style\":\"%s\"}", escaped, style);
    emit_event("MESSAGE", buf);
}

/* M2: Emit map frame with all glyphs
 * If force is TRUE, emit even if map isn't dirty (for cursor-only updates)
 */
static void
emit_map_frame_ex(int force)
{
    int y, x;
    
    if (!g_map_dirty && !force) return;
    
    /* Build JSON for map frame with full cell data (char, color, special) */
    /* Format: {"width":80,"height":21,"cursor":{"x":X,"y":Y},"cells":[{"x":X,"y":Y,"glyph":N,"ch":"C","color":N,"special":N},...]} */
    char buf[131072];  /* Larger buffer for full cell data */
    int pos = 0;
    
    pos += snprintf(buf + pos, sizeof(buf) - pos,
                    "{\"width\":%d,\"height\":%d,\"cursor\":{\"x\":%d,\"y\":%d},\"cells\":[",
                    MAP_COLS, MAP_ROWS, g_cursor_x, g_cursor_y);
    
    /* Emit cells with mapglyph conversion */
    int first = 1;
    for (y = 0; y < MAP_ROWS; y++) {
        for (x = 0; x < MAP_COLS; x++) {
            int glyph = g_map[y][x].glyph;
            
            /* Skip uninitialized cells (like Win32 does) */
            if (glyph == NO_GLYPH) {
                continue;
            }
            
            int ochar = ' ';
            int ocolor = 7;  /* Default to gray */
            unsigned ospecial = 0;
            
            /* Use mapglyph() to convert glyph to character/color/special */
            /* This is the same function TTY port uses for display */
            /* TTY always calls mapglyph - we should too */
            mapglyph(glyph, &ochar, &ocolor, &ospecial, x, y, 0);
            
            if (!first) {
                pos += snprintf(buf + pos, sizeof(buf) - pos, ",");
            }
            first = 0;
            
            /* Emit cell with char, color, special flags */
            /* Escape special characters in JSON */
            char ch_escaped[8];
            if (ochar == '"') {
                strcpy(ch_escaped, "\\\"");
            } else if (ochar == '\\') {
                strcpy(ch_escaped, "\\\\");
            } else if (ochar < 32 || ochar > 126) {
                /* Non-printable - use space */
                ch_escaped[0] = ' ';
                ch_escaped[1] = '\0';
            } else {
                ch_escaped[0] = (char)ochar;
                ch_escaped[1] = '\0';
            }
            
            pos += snprintf(buf + pos, sizeof(buf) - pos,
                            "{\"x\":%d,\"y\":%d,\"glyph\":%d,\"ch\":\"%s\",\"color\":%d,\"special\":%u}",
                            x, y, glyph, ch_escaped, ocolor, ospecial);
        }
    }
    
    pos += snprintf(buf + pos, sizeof(buf) - pos, "]}");
    
    emit_event("MAP_FRAME", buf);
    g_map_dirty = 0;
    
    /* Clear dirty flags */
    for (y = 0; y < MAP_ROWS; y++) {
        for (x = 0; x < MAP_COLS; x++) {
            g_map[y][x].dirty = 0;
        }
    }
}

/* Wrapper for backward compatibility */
static void
emit_map_frame(void)
{
    emit_map_frame_ex(0);
}

/* ========================================================================
 * INPUT: BLOCKING REQUESTS
 * ======================================================================== */

static int
parse_json_field_str(const char *json, const char *field, char *out, size_t outsz)
{
    out[0] = '\0';
    char pattern[128];
    snprintf(pattern, sizeof(pattern), "\"%s\"", field);
    const char *p = strstr(json, pattern);
    if (!p) return 0;
    
    p = strchr(p, ':');
    if (!p) return 0;
    p++;
    while (*p && isspace((unsigned char)*p)) p++;
    if (*p != '"') return 0;
    p++;
    
    size_t i = 0;
    while (*p && *p != '"' && i + 1 < outsz) {
        /* Simple unescape */
        if (*p == '\\' && *(p+1)) {
            p++;
            if (*p == 'n') out[i++] = '\n';
            else if (*p == 'r') out[i++] = '\r';
            else if (*p == 't') out[i++] = '\t';
            else if (*p == 'u' && isxdigit((unsigned char)*(p+1)) && 
                     isxdigit((unsigned char)*(p+2)) && 
                     isxdigit((unsigned char)*(p+3)) && 
                     isxdigit((unsigned char)*(p+4))) {
                /* Handle \uXXXX Unicode escape */
                char hex[5];
                hex[0] = *(++p);
                hex[1] = *(++p);
                hex[2] = *(++p);
                hex[3] = *(++p);
                hex[4] = '\0';
                unsigned int codepoint = (unsigned int)strtol(hex, NULL, 16);
                /* Handle extended ASCII range (0-255) for meta keys */
                if (codepoint < 256) {
                    out[i++] = (char)codepoint;
                }
                p++;
            }
            else out[i++] = *p;
            p++;
        } else {
            out[i++] = *p++;
        }
    }
    out[i] = '\0';
    return 1;
}

static int
parse_json_field_int(const char *json, const char *field)
{
    char pattern[128];
    snprintf(pattern, sizeof(pattern), "\"%s\"", field);
    const char *p = strstr(json, pattern);
    if (!p) return -1;
    
    p = strchr(p, ':');
    if (!p) return -1;
    p++;
    while (*p && isspace((unsigned char)*p)) p++;
    
    int val = 0, neg = 0;
    if (*p == '-') { neg = 1; p++; }
    while (*p && isdigit((unsigned char)*p)) {
        val = val * 10 + (*p - '0');
        p++;
    }
    return neg ? -val : val;
}

/* External function from headless_lib.js - uses Asyncify to wait for stdin line */
extern char *headless_read_line_blocking(void);

static void
send_request(const char *kind, int req_id, const char *json_data, char *response_buf, size_t bufsz)
{
    long ts = now_ms();
    if (!g_out) g_out = stdout;
    
    // fprintf(stderr, "[headless] send_request: EMITTING REQ kind=%s id=%d\n", kind, req_id);
    
    /* Emit REQ */
    if (json_data && *json_data) {
        fprintf(g_out, "{\"v\":1,\"type\":\"REQ\",\"kind\":\"%s\",\"id\":%d,\"ts\":%ld,\"data\":%s}\n",
                kind, req_id, ts, json_data);
    } else {
        fprintf(g_out, "{\"v\":1,\"type\":\"REQ\",\"kind\":\"%s\",\"id\":%d,\"ts\":%ld}\n",
                kind, req_id, ts);
    }
    fflush(g_out);
    
    // fprintf(stderr, "[headless] send_request: WAITING for RESP with corr=%d\n", req_id);
    
    /* Block waiting for RESP with matching corr */
    response_buf[0] = '\0';
    
    /* In WASM environment, use Asyncify-aware line reading */
    /* This blocks C execution until JavaScript provides the RESP line */
#ifdef __EMSCRIPTEN__
    while (1) {
        char *line = headless_read_line_blocking();
        if (!line) {
            /* Fall back to regular fgets for compatibility */
            if (!fgets(response_buf, bufsz, stdin)) {
                return;
            }
        } else {
            /* Copy line to response buffer */
            strncpy(response_buf, line, bufsz - 1);
            response_buf[bufsz - 1] = '\0';
            free(line);  /* headless_read_line_blocking allocates with malloc */
        }
        
        int corr = parse_json_field_int(response_buf, "corr");
        if (corr == req_id) {
            return;
        }
    }
#else
    /* Non-WASM: use regular blocking fgets */
    while (fgets(response_buf, bufsz, stdin)) {
        int corr = parse_json_field_int(response_buf, "corr");
        if (corr == req_id) {
            return;
        }
    }
#endif
}

/* ========================================================================
 * WINDOW PORT API: INITIALIZATION
 * ======================================================================== */

static void
headless_init_nhwindows(int *argcp, char **argv)
{
    int x, y;
    char debug_buf[512];
    
    g_out = stdout;
    g_initialized = 1;
    
    /* Mark window system as initialized so yn() prompts work */
    iflags.window_inited = 1;
    
    /* Initialize display symbols early (before initoptions is called)
     * This ensures mapglyph() works correctly when first map is drawn.
     * Normally init_symbols() is called later in initoptions(), but
     * we need it ready for early map rendering.
     */
    init_symbols();
    
    /* M2: Initialize map buffer - use NO_GLYPH like Win32 does */
    for (y = 0; y < MAP_ROWS; y++) {
        for (x = 0; x < MAP_COLS; x++) {
            g_map[y][x].glyph = NO_GLYPH;
            g_map[y][x].bkglyph = NO_GLYPH;
            g_map[y][x].dirty = 0;
        }
    }
    g_cursor_x = 0;
    g_cursor_y = 0;
    g_map_dirty = 0;
    
    /* Emit startup event with debug info */
    snprintf(debug_buf, sizeof(debug_buf), 
             "{\"engine\":\"EasyNetHack\",\"version\":\"3.6.7-headless\","
             "\"debug\":{\"num_pad\":%d,\"cmd_num_pad\":%d,\"dirchars\":\"%s\"}}",
             iflags.num_pad, Cmd.num_pad, Cmd.dirchars ? Cmd.dirchars : "null");
    emit_event("INIT", debug_buf);
}

#ifdef __EMSCRIPTEN__
/* Apply character options from JavaScript character creation UI
 * Called from main_wasm.c before player_selection()
 * Returns 1 if options were applied, 0 if not available */
EMSCRIPTEN_KEEPALIVE
int apply_character_options_from_js(void)
{
    /* Check if character options exist */
    int has_options = EM_ASM_INT({
        if (typeof Module.characterOptions !== "undefined" && 
            Module.characterOptions) {
            return 1;
        }
        return 0;
    });
    
    if (!has_options) {
        return 0;
    }
    
    /* Read individual character option fields */
    char *name = (char*)EM_ASM_INT({
        if (!Module.characterOptions.name) return 0;
        var nameLen = lengthBytesUTF8(Module.characterOptions.name) + 1;
        var namePtr = _malloc(nameLen);
        stringToUTF8(Module.characterOptions.name, namePtr, nameLen);
        return namePtr;
    });
    
    /* Get role string and map to index */
    char *roleStr = (char*)EM_ASM_INT({
        if (!Module.characterOptions.role) return 0;
        var s = Module.characterOptions.role.toLowerCase();
        var len = lengthBytesUTF8(s) + 1;
        var ptr = _malloc(len);
        stringToUTF8(s, ptr, len);
        return ptr;
    });
    
    char *raceStr = (char*)EM_ASM_INT({
        if (!Module.characterOptions.race) return 0;
        var s = Module.characterOptions.race.toLowerCase();
        var len = lengthBytesUTF8(s) + 1;
        var ptr = _malloc(len);
        stringToUTF8(s, ptr, len);
        return ptr;
    });
    
    char *genderStr = (char*)EM_ASM_INT({
        if (!Module.characterOptions.gender) return 0;
        var s = Module.characterOptions.gender.toLowerCase();
        var len = lengthBytesUTF8(s) + 1;
        var ptr = _malloc(len);
        stringToUTF8(s, ptr, len);
        return ptr;
    });
    
    char *alignStr = (char*)EM_ASM_INT({
        if (!Module.characterOptions.alignment) return 0;
        var s = Module.characterOptions.alignment.toLowerCase();
        var len = lengthBytesUTF8(s) + 1;
        var ptr = _malloc(len);
        stringToUTF8(s, ptr, len);
        return ptr;
    });
    
    /* Apply name */
    if (name && *name) {
        strncpy(plname, name, PL_NSIZ - 1);
        plname[PL_NSIZ - 1] = '\0';
        free(name);
    }
    
    /* Map role string to index */
    if (roleStr) {
        if (strcmp(roleStr, "archeologist") == 0) flags.initrole = 0;
        else if (strcmp(roleStr, "barbarian") == 0) flags.initrole = 1;
        else if (strcmp(roleStr, "caveman") == 0) flags.initrole = 2;
        else if (strcmp(roleStr, "healer") == 0) flags.initrole = 3;
        else if (strcmp(roleStr, "knight") == 0) flags.initrole = 4;
        else if (strcmp(roleStr, "monk") == 0) flags.initrole = 5;
        else if (strcmp(roleStr, "priest") == 0) flags.initrole = 6;
        else if (strcmp(roleStr, "ranger") == 0) flags.initrole = 7;
        else if (strcmp(roleStr, "rogue") == 0) flags.initrole = 8;
        else if (strcmp(roleStr, "samurai") == 0) flags.initrole = 9;
        else if (strcmp(roleStr, "tourist") == 0) flags.initrole = 10;
        else if (strcmp(roleStr, "valkyrie") == 0) flags.initrole = 11;
        else if (strcmp(roleStr, "wizard") == 0) flags.initrole = 12;
        free(roleStr);
    }
    
    /* Map race string to index */
    if (raceStr) {
        if (strcmp(raceStr, "human") == 0) flags.initrace = 0;
        else if (strcmp(raceStr, "elf") == 0) flags.initrace = 1;
        else if (strcmp(raceStr, "dwarf") == 0) flags.initrace = 2;
        else if (strcmp(raceStr, "gnome") == 0) flags.initrace = 3;
        else if (strcmp(raceStr, "orc") == 0) flags.initrace = 4;
        free(raceStr);
    }
    
    /* Map gender string to index */
    if (genderStr) {
        if (strcmp(genderStr, "male") == 0) {
            flags.initgend = 0;
            flags.female = 0;
        } else if (strcmp(genderStr, "female") == 0) {
            flags.initgend = 1;
            flags.female = 1;
        }
        free(genderStr);
    }
    
    /* Map alignment string to index */
    if (alignStr) {
        if (strcmp(alignStr, "lawful") == 0) flags.initalign = 0;
        else if (strcmp(alignStr, "neutral") == 0) flags.initalign = 1;
        else if (strcmp(alignStr, "chaotic") == 0) flags.initalign = 2;
        free(alignStr);
    }
    
    return 1;
}
#endif

static void
headless_player_selection(void)
{
    /* Set up default character if not already specified
     * This is needed for headless/WASM builds where interactive
     * character selection is not available */
    
    /* Use ROLE_RANDOM to trigger automatic selection ONLY if not already set */
    if (flags.initrole == ROLE_NONE) {
        flags.initrole = ROLE_RANDOM;
    }
    if (flags.initrace == ROLE_NONE) {
        flags.initrace = ROLE_RANDOM;
    }
    if (flags.initgend == ROLE_NONE) {
        flags.initgend = ROLE_RANDOM;
    }
    if (flags.initalign == ROLE_NONE) {
        flags.initalign = ROLE_RANDOM;
    }
    
    /* Call rigid_role_checks() to finalize character selection
     * This picks random values for any ROLE_RANDOM settings */
    rigid_role_checks();
}

static void
headless_askname(void)
{
    /* Will use getlin in M1 */
    /* For now, use a default */
    strcpy(plname, "Headless");
}

static void
headless_get_nh_event(void)
{
    /* Input handling - for M1, this is stub */
    /* M2+ will handle key events */
}

static void
headless_exit_nhwindows(const char *str)
{
    if (str) {
        emit_message(str, "normal");
    }
    
#ifdef __EMSCRIPTEN__
    /* CRITICAL FIX: Sync filesystem to IndexedDB after save completes
     * This ensures saves persist across page reloads.
     * The game has already written save files to /nethack_data/
     * Now we sync that directory to browser's IndexedDB storage.
     */
    extern void wasm_sync_saves(void);  /* Defined in main_wasm.c */
    wasm_sync_saves();
#endif
    
    emit_event("EXIT", NULL);
    g_initialized = 0;
}

static void
headless_suspend_nhwindows(const char *str)
{
    if (str) {
        emit_message(str, "normal");
    }
}

static void
headless_resume_nhwindows(void)
{
    /* no-op */
}

/* ========================================================================
 * WINDOW PORT API: WINDOW MANAGEMENT
 * ======================================================================== */

static winid
headless_create_nhwindow(int type)
{
    /* For M1: just return dummy window IDs */
    /* M2+ will track actual windows */
    static winid next_win = 1;
    return next_win++;
}

static void
headless_clear_nhwindow(winid window)
{
    /* This ensures old floor data is cleared when entering new levels */
    if (window == WIN_MAP) {
        int x, y;
        for (y = 0; y < MAP_ROWS; y++) {
            for (x = 0; x < MAP_COLS; x++) {
                g_map[y][x].glyph = NO_GLYPH;
                g_map[y][x].bkglyph = NO_GLYPH;
                g_map[y][x].dirty = 1;  /* Mark as dirty to emit in next frame */
            }
        }
        g_map_dirty = 1;
        /* Note: Don't emit immediately - wait for curs() or mark_synch() */
        /* NetHack will redraw the new level after clearing */
    }
    /* Other window types: no-op for now */
}

static void
headless_display_nhwindow(winid window, BOOLEAN_P blocking)
{
    /* no-op for M1 */
    (void)window;
    (void)blocking;
}

static void
headless_destroy_nhwindow(winid window)
{
    /* no-op for M1 */
}

/* Track if cursor position changed - used to emit frame before input */
static int g_cursor_dirty = 0;

static void
headless_curs(winid window, int x, int y)
{
    /* Win32-style: Just store cursor position and mark dirty.
     * Do NOT emit immediately - wait until nhgetch() before blocking for input.
     * This batches multiple curs() calls (e.g., far look mode calls curs 3x)
     * into a single MAP_FRAME emission. */
    if (g_cursor_x != x || g_cursor_y != y) {
        g_cursor_dirty = 1;
    }
    g_cursor_x = x;
    g_cursor_y = y;
}

static void
headless_putstr(winid window, int attr, const char *text)
{
    /* For M1: emit MESSAGE event for WIN_MESSAGE window */
    /* TODO M2+: Handle other window types */
    if (text && *text) {
        /* Determine style based on attr */
        const char *style = "normal";
        if (attr & ATR_BOLD) style = "bold";
        else if (attr & ATR_INVERSE) style = "inverse";
        
        emit_message(text, style);
    }
}

static void
headless_display_file(const char *filename, BOOLEAN_P must_exist)
{
    /* M5: handle file display */
    /* For now, emit as message */
    char buf[512];
    snprintf(buf, sizeof(buf), "[FILE: %s]", filename);
    emit_message(buf, "normal");
}

/* ========================================================================
 * WINDOW PORT API: MAP (M2 implementation)
 * ======================================================================== */

static void
headless_print_glyph(winid window, XCHAR_P x, XCHAR_P y, int glyph, int bkglyph)
{
    /* Bounds check */
    if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) {
        fprintf(stderr, "[headless] print_glyph: OUT OF BOUNDS x=%d y=%d\n", (int)x, (int)y);
        return;
    }
    
    /* Update map buffer */
    g_map[y][x].glyph = glyph;
    g_map[y][x].bkglyph = bkglyph;
    g_map[y][x].dirty = 1;
    g_map_dirty = 1;
    
    /* Don't emit immediately - wait for curs() or mark_synch() */
}

static void
headless_raw_print(const char *str)
{
    /* Raw print: used for early messages before window system is ready */
    if (str && *str) {
        emit_message(str, "normal");
    }
}

static void
headless_raw_print_bold(const char *str)
{
    /* Raw print bold: early messages with emphasis */
    if (str && *str) {
        emit_message(str, "bold");
    }
}

#ifdef __EMSCRIPTEN__
/* Declare the JS library function (BrowserHack pattern) */
extern int headless_wait_for_input_blocking(void);

/* WASM version: Call library function that uses Asyncify.handleSleep */
static int
headless_nhgetch(void)
{
    /* Win32-style: Flush pending map/cursor updates before blocking for input.
     * This is where mswin_map_update() is called in Win32's mswin_main_loop().
     * By emitting here, we batch all curs()/print_glyph() calls into one frame. */
    if (g_map_dirty) {
        emit_map_frame();
        g_cursor_dirty = 0;
    } else if (g_cursor_dirty) {
        emit_map_frame_ex(1);  /* Force emit for cursor-only update */
        g_cursor_dirty = 0;
    }
    
    /* Call the library function - it handles Asyncify internally */
    int keycode = headless_wait_for_input_blocking();
    return keycode;
}
#else
/* Native version: Use fgets() which blocks normally on OS pipe */
static int
headless_nhgetch(void)
{
    /* M2: Handle key input from stdin */
    char response[16384];
    
    // fprintf(stderr, "[headless] nhgetch: waiting for INPUT...\n");
    
    /* Wait for INPUT event */
    while (1) {
        char *result = fgets(response, sizeof(response), stdin);
        
        if (!result) {
            fprintf(stderr, "[headless] nhgetch: EOF on stdin\n");
            return '\033'; /* ESC on EOF */
        }
        
        // fprintf(stderr, "[headless] nhgetch: received line: %.100s\n", response);
        
        char type_str[64];
        if (parse_json_field_str(response, "type", type_str, sizeof(type_str))) {
            if (strcmp(type_str, "INPUT") == 0) {
                /* Try keycode field first (for high-bit characters from JS/JSON) */
                int keycode = parse_json_field_int(response, "keycode");
                if (keycode >= 0 && keycode <= 255) {
                    // fprintf(stderr, "[headless] nhgetch: returning keycode %d\n", keycode);
                    return keycode;
                }
                
                /* Fallback to key string field (for Python tests and ASCII keys) */
                char key_str[16];
                if (parse_json_field_str(response, "key", key_str, sizeof(key_str))) {
                    if (key_str[0]) {
                        // fprintf(stderr, "[headless] nhgetch: returning key '%c' (0x%02x)\n", 
                        //         key_str[0], (unsigned char)key_str[0]);
                        return (int)key_str[0];
                    }
                }
            }
        }
        /* Ignore other events and continue loop */
        // fprintf(stderr, "[headless] nhgetch: ignoring non-INPUT event, continuing...\n");
    }
}
#endif

static int
headless_nh_poskey(int *x, int *y, int *mod)
{
    /* M2: Handle positional input (similar to nhgetch for now) */
    /* For M2, we don't handle mouse clicks, just keyboard */
    int ch = headless_nhgetch();
    
    if (x) *x = -1;
    if (y) *y = -1;
    if (mod) *mod = 0;
    
    return ch;
}

/* ========================================================================
 * WINDOW PORT API: PROMPTS (M1 implementation)
 * ======================================================================== */

char
headless_yn_function(const char *question, const char *choices, CHAR_P def)
{
    /* Generate PROMPT_YN request */
    int req_id = g_next_req_id++;
    
    // fprintf(stderr, "[headless] yn_function: ENTER req_id=%d question='%.50s' choices='%s' def='%c'\n",
    //         req_id, question, choices ? choices : "NULL", def);
    
    char escaped_q[4096];
    char escaped_choices[128];
    char escaped_def[16];
    
    json_escape(question, escaped_q, sizeof(escaped_q));
    
    /* Handle NULL choices (e.g., directional prompts) */
    if (choices) {
        json_escape(choices, escaped_choices, sizeof(escaped_choices));
    } else {
        escaped_choices[0] = '\0';
    }
    
    char def_str[2] = {def, '\0'};
    json_escape(def_str, escaped_def, sizeof(escaped_def));
    
    char req_data[8192];
    snprintf(req_data, sizeof(req_data), 
             "{\"q\":\"%s\",\"choices\":\"%s\",\"def\":\"%s\"}",
             escaped_q, escaped_choices, escaped_def);
    
    // fprintf(stderr, "[headless] yn_function: SENDING REQ req_id=%d\n", req_id);
    char response[16384];
    send_request("PROMPT_YN", req_id, req_data, response, sizeof(response));
    
    // fprintf(stderr, "[headless] yn_function: RECEIVED RESP req_id=%d response='%.100s'\n", 
    //         req_id, response);
    
    /* Parse response for "ch" field */
    char ch_str[16];
    if (parse_json_field_str(response, "ch", ch_str, sizeof(ch_str))) {
        if (ch_str[0]) {
            // fprintf(stderr, "[headless] yn_function: RETURNING ch='%c' (code=%d) req_id=%d\n",
            //         ch_str[0], (int)ch_str[0], req_id);
            return ch_str[0];
        }
    }
    
    /* Default on parse failure */
    fprintf(stderr, "[headless] yn_function: RETURNING DEFAULT '%c' req_id=%d\n", def, req_id);
    return def;
}

static void
headless_getlin(const char *prompt, char *buf)
{
    /* Generate GETLIN request */
    int req_id = g_next_req_id++;
    
    char escaped_prompt[4096];
    json_escape(prompt, escaped_prompt, sizeof(escaped_prompt));
    
    char req_data[8192];
    snprintf(req_data, sizeof(req_data), "{\"prompt\":\"%s\",\"def\":\"\"}", escaped_prompt);
    
    char response[16384];
    send_request("GETLIN", req_id, req_data, response, sizeof(response));
    
    /* Parse response for "text" field */
    if (!parse_json_field_str(response, "text", buf, BUFSZ)) {
        buf[0] = '\0';
    }
}

static int
headless_get_ext_cmd(void)
{
    /* M5: Win32-style extended command interface.
     * Directly enter text input mode with autocomplete support.
     * This allows accessing all commands including those without
     * keyboard accelerators (like #exploremode).
     */
    char buf[BUFSZ];
    int ret;
    
    /* Directly prompt for command name (like Win32) */
    headless_getlin("Extended command: ", buf);
    
    if (buf[0] == '\033' || buf[0] == '\0') {
        return -1;  /* Cancelled or empty */
    }
    
    /* Search for matching command (case-insensitive) */
    for (ret = 0; extcmdlist[ret].ef_txt != (char *)0; ret++) {
        if (!strcmpi(buf, extcmdlist[ret].ef_txt)) {
            return ret;  /* Found it! */
        }
    }
    
    /* No match found */
    pline("Unknown extended command '%s'.", buf);
    return -1;
}

/* ========================================================================
 * WINDOW PORT API: MENUS (M3 implementation)
 * ======================================================================== */

static void
headless_start_menu(winid window)
{
    /* Initialize menu state */
    g_menu.menu_id = g_next_menu_id++;
    g_menu.window = window;
    g_menu.item_count = 0;
    g_menu.prompt[0] = '\0';
    g_menu.how = PICK_ANY;
    g_menu.active = TRUE;
    
    /* Emit MENU_BEGIN event */
    char buf[256];
    snprintf(buf, sizeof(buf), "{\"id\":%d,\"window\":%d}", 
             g_menu.menu_id, window);
    emit_event("MENU_BEGIN", buf);
}

static void
headless_add_menu(winid window, int glyph, const ANY_P *identifier,
                  CHAR_P accelerator, CHAR_P group_accel, int attr,
                  const char *str, BOOLEAN_P presel)
{
    if (!g_menu.active || g_menu.item_count >= MAX_MENU_ITEMS) {
        return;
    }
    
    if (!str) str = "";
    
    MenuItem *item = &g_menu.items[g_menu.item_count++];
    
    /* Store item data */
    item->identifier = identifier ? *identifier : zeroany;
    strncpy(item->text, str, sizeof(item->text) - 1);
    item->text[sizeof(item->text) - 1] = '\0';
    item->accel = accelerator;
    item->group_accel = group_accel;
    item->glyph = glyph;
    item->attr = attr;
    item->selectable = (identifier && identifier->a_obj != NULL);
    item->selected = presel;
    item->count = 0;
    
    /* Emit MENU_ITEM event */
    char escaped[1024];
    json_escape(item->text, escaped, sizeof(escaped));
    
    /* Escape special characters in accelerators for JSON */
    char accel_str[16];
    char group_accel_str[16];
    char accel_char = accelerator ? accelerator : ' ';
    char group_char = group_accel ? group_accel : ' ';
    
    if (accel_char == '"' || accel_char == '\\') {
        snprintf(accel_str, sizeof(accel_str), "\\%c", accel_char);
    } else {
        snprintf(accel_str, sizeof(accel_str), "%c", accel_char);
    }
    
    if (group_char == '"' || group_char == '\\') {
        snprintf(group_accel_str, sizeof(group_accel_str), "\\%c", group_char);
    } else {
        snprintf(group_accel_str, sizeof(group_accel_str), "%c", group_char);
    }
    
    char buf[2048];
    snprintf(buf, sizeof(buf),
             "{\"id\":%d,\"item_id\":%d,\"text\":\"%s\",\"accel\":\"%s\","
             "\"group_accel\":\"%s\",\"glyph\":%d,\"attr\":%d,"
             "\"selectable\":%s,\"selected\":%s}",
             g_menu.menu_id,
             (int)(item - g_menu.items),  /* Use array index as item_id */
             escaped,
             accel_str,
             group_accel_str,
             glyph,
             attr,
             item->selectable ? "true" : "false",
             item->selected ? "true" : "false");
    emit_event("MENU_ITEM", buf);
}

static void
headless_end_menu(winid window, const char *prompt)
{
    if (!g_menu.active) {
        return;
    }
    
    /* Store prompt */
    if (prompt) {
        strncpy(g_menu.prompt, prompt, sizeof(g_menu.prompt) - 1);
        g_menu.prompt[sizeof(g_menu.prompt) - 1] = '\0';
    } else {
        g_menu.prompt[0] = '\0';
    }
    
    /* Emit MENU_END event */
    char escaped[1024];
    json_escape(g_menu.prompt, escaped, sizeof(escaped));
    
    char buf[2048];
    snprintf(buf, sizeof(buf),
             "{\"id\":%d,\"prompt\":\"%s\",\"count\":%d}",
             g_menu.menu_id, escaped, g_menu.item_count);
    emit_event("MENU_END", buf);
}

static int
headless_select_menu(winid window, int how, MENU_ITEM_P **selected)
{
    if (!g_menu.active) {
        *selected = NULL;
        return 0;
    }
    
    g_menu.how = how;
    
    /* Send REQ:MENU_SELECT and block for response */
    char req_buf[512];
    snprintf(req_buf, sizeof(req_buf), "{\"id\":%d,\"how\":%d}", 
             g_menu.menu_id, how);
    
    char response[16384];
    int req_id = g_next_req_id++;
    send_request("MENU_SELECT", req_id, req_buf, response, sizeof(response));
    
    /* Parse response to extract selected items */
    /* Response format: {"items":[{"item_id":N,"count":C},...]} */
    
    int selected_count = 0;
    MENU_ITEM_P *items = NULL;
    
    /* Simple parser: count items array entries */
    const char *p = strstr(response, "\"items\"");
    if (p) {
        p = strchr(p, '[');
        if (p) {
            p++;
            /* Count comma-separated objects */
            int depth = 0;
            const char *scan = p;
            while (*scan && *scan != ']') {
                if (*scan == '{') {
                    if (depth == 0) selected_count++;
                    depth++;
                } else if (*scan == '}') {
                    depth--;
                }
                scan++;
            }
        }
    }
    
    if (selected_count > 0) {
        items = (MENU_ITEM_P *) alloc(selected_count * sizeof(menu_item));
        
        /* Parse each selected item */
        p = strstr(response, "\"items\"");
        if (p) {
            p = strchr(p, '[');
            if (p) {
                p++;
                int idx = 0;
                while (*p && *p != ']' && idx < selected_count) {
                    /* Find item_id */
                    const char *id_pos = strstr(p, "\"item_id\"");
                    if (!id_pos || id_pos > strchr(p, ']')) break;
                    
                    int item_id = parse_json_field_int(id_pos, "item_id");
                    long count = -1;  /* Default to -1 (all) like NetHack expects */
                    
                    /* Find count if present */
                    const char *count_pos = strstr(id_pos, "\"count\"");
                    if (count_pos && count_pos < strchr(id_pos, '}')) {
                        count = parse_json_field_int(count_pos, "count");
                        /* NetHack uses -1 to mean "all", so preserve it */
                    }
                    
                    /* Store in result */
                    if (item_id >= 0 && item_id < g_menu.item_count) {
                        items[idx].item = g_menu.items[item_id].identifier;
                        items[idx].count = count;
                        idx++;
                    }
                    
                    /* Move to next item */
                    p = strchr(id_pos, '}');
                    if (p) p++;
                }
                selected_count = idx;  /* Actual count of parsed items */
            }
        }
    }
    
    *selected = items;
    g_menu.active = FALSE;
    return selected_count;
}

/* ========================================================================
 * WINDOW PORT API: STATUS (stubs for M1, implemented in M4)
 * ======================================================================== */

static void
headless_status_init(void)
{
    /* M4: Initialize status cache */
    memset(&g_status, 0, sizeof(g_status));
    
    /* Call generic status initialization to set up status_vals arrays */
    genl_status_init();
}

static void
headless_status_finish(void)
{
    /* M4: status cleanup - call generic cleanup */
    genl_status_finish();
}

static void
headless_status_enablefield(int fieldidx, const char *nm, const char *fmt, BOOLEAN_P enable)
{
    /* M4: configure status fields - delegate to generic handler */
    genl_status_enablefield(fieldidx, nm, fmt, enable);
}

static void
headless_status_update(int idx, genericptr_t ptr, int chg, int percent, int color, unsigned long *colormasks)
{
    /* M4: Update status fields and emit STATUS event on BL_FLUSH/BL_RESET */
    (void)chg;
    (void)percent;
    (void)color;
    (void)colormasks;
    
    char *text = (char *)ptr;
    long *condptr = (long *)ptr;
    
    /* Handle special indices */
    if (idx == BL_FLUSH || idx == BL_RESET) {
        /* Emit STATUS event with all cached values 
         * BL_RESET means "force redisplay" not "clear cache"
         * Both BL_FLUSH and BL_RESET should emit current status without clearing
         */
        char buf[1024];
        char escaped_title[512];
        char escaped_str[64];
        char escaped_dex[64];
        char escaped_con[64];
        char escaped_int[64];
        char escaped_wis[64];
        char escaped_cha[64];
        char escaped_align[64];
        
        /* Escape strings for JSON */
        json_escape(g_status.title, escaped_title, sizeof(escaped_title));
        json_escape(g_status.str, escaped_str, sizeof(escaped_str));
        json_escape(g_status.dex, escaped_dex, sizeof(escaped_dex));
        json_escape(g_status.con, escaped_con, sizeof(escaped_con));
        json_escape(g_status.intel, escaped_int, sizeof(escaped_int));
        json_escape(g_status.wis, escaped_wis, sizeof(escaped_wis));
        json_escape(g_status.cha, escaped_cha, sizeof(escaped_cha));
        json_escape(g_status.align, escaped_align, sizeof(escaped_align));
        
        snprintf(buf, sizeof(buf),
                 "{\"title\":\"%s\",\"str\":\"%s\",\"dex\":\"%s\",\"con\":\"%s\","
                 "\"int\":\"%s\",\"wis\":\"%s\",\"cha\":\"%s\",\"align\":\"%s\","
                 "\"gold\":%ld,\"hp\":%d,\"hpmax\":%d,\"pw\":%d,\"pwmax\":%d,"
                 "\"ac\":%d,\"xlvl\":%d,\"dlvl\":%d,\"exp\":%ld,"
                 "\"enc\":%d,\"hunger\":%d,\"cond\":%lu,\"turn\":%ld,\"score\":%ld}",
                 escaped_title, escaped_str, escaped_dex, escaped_con,
                 escaped_int, escaped_wis, escaped_cha, escaped_align,
                 g_status.gold, g_status.hp, g_status.hpmax,
                 g_status.pw, g_status.pwmax,
                 g_status.ac, g_status.xlvl, g_status.dlvl,
                 g_status.exp, g_status.enc, g_status.hunger,
                 g_status.cond, g_status.turn, g_status.score);
        // fprintf(stdout, "[STATUS] BL_FLUSH: turn=%ld\n", g_status.turn);
        emit_event("STATUS", buf);
        return;
    }
    
    if (idx < 0 || idx >= MAXBLSTATS) {
        return;  /* Invalid index */
    }
    
    /* Update cached fields based on index */
    switch (idx) {
    case BL_TITLE:
        if (text) {
            strncpy(g_status.title, text, sizeof(g_status.title) - 1);
            g_status.title[sizeof(g_status.title) - 1] = '\0';
        }
        break;
    case BL_STR:
        /* Format: " St:13" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            const char *val = colon ? colon + 1 : text;
            strncpy(g_status.str, val, sizeof(g_status.str) - 1);
            g_status.str[sizeof(g_status.str) - 1] = '\0';
        }
        break;
    case BL_DX:
        /* Format: " Dx:18" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            const char *val = colon ? colon + 1 : text;
            strncpy(g_status.dex, val, sizeof(g_status.dex) - 1);
            g_status.dex[sizeof(g_status.dex) - 1] = '\0';
        }
        break;
    case BL_CO:
        /* Format: " Co:13" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            const char *val = colon ? colon + 1 : text;
            strncpy(g_status.con, val, sizeof(g_status.con) - 1);
            g_status.con[sizeof(g_status.con) - 1] = '\0';
        }
        break;
    case BL_IN:
        /* Format: " In:10" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            const char *val = colon ? colon + 1 : text;
            strncpy(g_status.intel, val, sizeof(g_status.intel) - 1);
            g_status.intel[sizeof(g_status.intel) - 1] = '\0';
        }
        break;
    case BL_WI:
        /* Format: " Wi:10" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            const char *val = colon ? colon + 1 : text;
            strncpy(g_status.wis, val, sizeof(g_status.wis) - 1);
            g_status.wis[sizeof(g_status.wis) - 1] = '\0';
        }
        break;
    case BL_CH:
        /* Format: " Ch:11" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            const char *val = colon ? colon + 1 : text;
            strncpy(g_status.cha, val, sizeof(g_status.cha) - 1);
            g_status.cha[sizeof(g_status.cha) - 1] = '\0';
        }
        break;
    case BL_ALIGN:
        if (text) {
            strncpy(g_status.align, text, sizeof(g_status.align) - 1);
            g_status.align[sizeof(g_status.align) - 1] = '\0';
        }
        break;
    case BL_GOLD:
        /* Gold comes formatted as "$:5000" or "\GXXXXNNNN:5000" */
        /* Skip to the colon and parse the number after it */
        if (text) {
            const char *colon = strchr(text, ':');
            if (colon) {
                g_status.gold = atol(colon + 1);
            } else {
                /* Fallback: try to parse as-is */
                g_status.gold = atol(text);
            }
        }
        break;
    case BL_HP:
        /* Format: " HP:14" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            g_status.hp = atoi(colon ? colon + 1 : text);
        }
        break;
    case BL_HPMAX:
        /* Format: "(14)" - just parse the number */
        if (text) g_status.hpmax = atoi(text);
        break;
    case BL_ENE:  /* Energy/Power/Mana */
        /* Format: " Pw:5" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            g_status.pw = atoi(colon ? colon + 1 : text);
        }
        break;
    case BL_ENEMAX:
        /* Format: "(5)" - just parse the number */
        if (text) g_status.pwmax = atoi(text);
        break;
    case BL_AC:
        /* Format: " AC:6" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            g_status.ac = atoi(colon ? colon + 1 : text);
        }
        break;
    case BL_XP:  /* Experience level */
        /* Format: " Xp:1" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            g_status.xlvl = atoi(colon ? colon + 1 : text);
        }
        break;
    case BL_EXP:  /* Experience points */
        if (text) {
            g_status.exp = atol(text);
        }
        break;
    case BL_LEVELDESC:
        /* Parse "Dlvl:5" or "Home 1" format */
        if (text) {
            const char *colon = strchr(text, ':');
            if (colon) {
                g_status.dlvl = atoi(colon + 1);
            } else {
                /* Try to find a number at end */
                const char *p = text + strlen(text) - 1;
                while (p > text && isdigit((unsigned char)*p)) p--;
                if (p < text + strlen(text) - 1) {
                    g_status.dlvl = atoi(p + 1);
                } else {
                    g_status.dlvl = 1;  /* Default */
                }
            }
        }
        break;
    case BL_CAP:  /* Encumbrance */
        /* Text is like "Burdened", "Stressed", etc. */
        if (text) {
            if (strstr(text, "Overloaded")) g_status.enc = 5;
            else if (strstr(text, "Overtaxed")) g_status.enc = 4;
            else if (strstr(text, "Strained")) g_status.enc = 3;
            else if (strstr(text, "Stressed")) g_status.enc = 2;
            else if (strstr(text, "Burdened")) g_status.enc = 1;
            else g_status.enc = 0;
        }
        break;
    case BL_HUNGER:
        /* Text is like "Hungry", "Weak", "Fainting", "Satiated", etc. */
        if (text) {
            if (strstr(text, "Satiated")) g_status.hunger = 1;
            else if (strstr(text, "Hungry")) g_status.hunger = -1;
            else if (strstr(text, "Weak")) g_status.hunger = -2;
            else if (strstr(text, "Fainting")) g_status.hunger = -3;
            else g_status.hunger = 0;  /* Normal */
        }
        break;
    case BL_CONDITION:
        /* Condition is a bitmask passed as long* */
        if (condptr) {
            g_status.cond = (unsigned long)*condptr;
        }
        break;
    case BL_TIME:
        /* Format: " T:123" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            long new_turn = atol(colon ? colon + 1 : text);
            // if (new_turn != g_status.turn) {
            //     fprintf(stdout, "[STATUS] Turn update: %ld -> %ld (text='%s')\n", 
            //             g_status.turn, new_turn, text);
            // }
            g_status.turn = new_turn;
        }
        break;
    case BL_SCORE:
        /* Format: " S:0" - skip past the colon */
        if (text) {
            const char *colon = strchr(text, ':');
            g_status.score = atol(colon ? colon + 1 : text);
        }
        break;
    default:
        /* Other fields not tracked */
        break;
    }
}

/* ========================================================================
 * WINDOW PORT API: MISCELLANEOUS
 * ======================================================================== */

static void
headless_mark_synch(void)
{
    /* Flush any batched map output.
     * Note: Primary emission now happens in nhgetch() before input.
     * mark_synch() is still called by NetHack in some cases. */
    if (g_map_dirty) {
        emit_map_frame();
        g_cursor_dirty = 0;
    } else if (g_cursor_dirty) {
        emit_map_frame_ex(1);
        g_cursor_dirty = 0;
    }
    if (g_out) fflush(g_out);
}

static void
headless_wait_synch(void)
{
    /* Block until client acknowledges - for M2, flush and mark_synch */
    headless_mark_synch();
}

static void
headless_cliparound(int x, int y)
{
    /* cliparound is for VIEWPORT scrolling, not cursor positioning.
     * It tells the display which portion of the map to show.
     * For our full-map emit model, we don't need viewport logic.
     * Do NOT set g_cursor here - that's curs()'s job. */
    (void)x;
    (void)y;
    /* No action needed - we emit the full map in nhgetch() */
}

static void
headless_update_inventory(void)
{
    /* M3: inventory updates */
}

static void
headless_print_glyph(winid window, XCHAR_P x, XCHAR_P y, int glyph, int bkglyph);

static void
headless_issue_mark_synch(winid window)
{
    headless_mark_synch();
}

static void
headless_delay_output(void)
{
    /* Visual delay - no-op for headless */
}

static void
headless_change_color(int color, long rgb, int reverse)
{
    /* M4: color customization */
}

static char *
headless_get_color_string(void)
{
    return (char *) 0;
}

static void
headless_start_screen(void)
{
    /* no-op */
}

static void
headless_end_screen(void)
{
    /* no-op */
}

static void
headless_outrip(winid window, int how, time_t when)
{
    /* M5: death screen */
    emit_message("Game Over", "bold");
}

static void
headless_preference_update(const char *pref)
{
    /* M5: handle preference changes */
}

static char *
headless_getmsghistory(BOOLEAN_P init)
{
    /* M5: message history */
    return (char *) 0;
}

static void
headless_putmsghistory(const char *msg, BOOLEAN_P is_restoring)
{
    /* M5: message history */
}

static void
headless_status_threshold(int idx, genericptr_t threshold, int behavior, int under, int over)
{
    /* M4: status thresholds */
}

static boolean
headless_can_suspend_yes(void)
{
    return TRUE;
}

/* Stub functions (to be implemented in later milestones) */
void
headless_nhbell(void)
{
    emit_event("BELL", NULL);
}

int
headless_doprev_message(void)
{
    /* M5: previous message navigation */
    return 0;
}

void
headless_number_pad(int state)
{
    /* M2: numpad configuration */
    (void)state;
}

/* ========================================================================
 * WINDOW PORT STRUCTURE
 * ======================================================================== */

struct window_procs headless_procs = {
    "headless",                     /* name */
    WC_COLOR | WC_HILITE_PET        /* wincap */
        | WC_ALIGN_MESSAGE | WC_ALIGN_STATUS
        | WC_INVERSE | WC_SCROLL_AMOUNT
        | WC_SCROLL_MARGIN | WC_MAP_MODE
        | WC_FONT_MESSAGE | WC_FONT_STATUS
        | WC_FONT_MENU | WC_FONT_TEXT
        | WC_FONT_MAP | WC_TILE_WIDTH
        | WC_TILE_HEIGHT | WC_TILE_FILE
        | WC_VARY_MSGCOUNT | WC_WINDOWCOLORS
        | WC_PLAYER_SELECTION,
    WC2_FULLSCREEN | WC2_SOFTKEYBOARD  /* wincap2 */
        | WC2_WRAPTEXT | WC2_HILITE_STATUS
        | WC2_FLUSH_STATUS | WC2_RESET_STATUS
        | WC2_HITPOINTBAR
        | WC2_URGENT_MESG | WC2_SUPPRESS_HIST,
#ifdef TEXTCOLOR
    {1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1},   /* has_color */
#else
    {1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1},
#endif
    headless_init_nhwindows,
    headless_player_selection,
    headless_askname,
    headless_get_nh_event,
    headless_exit_nhwindows,
    headless_suspend_nhwindows,
    headless_resume_nhwindows,
    headless_create_nhwindow,
    headless_clear_nhwindow,
    headless_display_nhwindow,
    headless_destroy_nhwindow,
    headless_curs,
    headless_putstr,
    genl_putmixed,                  /* Use generic */
    headless_display_file,
    headless_start_menu,
    headless_add_menu,
    headless_end_menu,
    headless_select_menu,
    genl_message_menu,              /* Use generic */
    headless_update_inventory,
    headless_mark_synch,
    headless_wait_synch,
#ifdef CLIPPING
    headless_cliparound,
#endif
#ifdef POSITIONBAR
    (void (*)(char *)) 0,
#endif
    headless_print_glyph,
    headless_raw_print,
    headless_raw_print_bold,
    headless_nhgetch,
    headless_nh_poskey,
    headless_nhbell,
    headless_doprev_message,
    headless_yn_function,
    headless_getlin,
    headless_get_ext_cmd,
    headless_number_pad,
    headless_delay_output,
#ifdef CHANGE_COLOR
    headless_change_color,
#ifdef MAC
    0,                              /* change_background (not implemented) */
    0,                              /* set_font_name (not implemented) */
#endif
    headless_get_color_string,
#endif
    headless_start_screen,
    headless_end_screen,
    headless_outrip,
    headless_preference_update,
    headless_getmsghistory,
    headless_putmsghistory,
    headless_status_init,
    headless_status_finish,
    headless_status_enablefield,
    headless_status_update,
    headless_can_suspend_yes,
};

#endif /* HEADLESS */
/*winheadless.c*/

