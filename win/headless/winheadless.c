/* NetHack 3.6 -- winheadless.c */
/* Headless window port for JSON protocol over stdio/WebSocket */

#include "hack.h"
#include "dlb.h"

#ifdef HEADLESS

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <ctype.h>

/* ========================================================================
 * GLOBALS & STATE
 * ======================================================================== */

static FILE *g_out = NULL;
static int g_next_req_id = 1;
static int g_initialized = 0;

/* Event queue (simplified for M1 - just immediate flush) */
/* TODO M2+: Add batching for map frames */

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

static void
send_request(const char *kind, int req_id, const char *json_data, char *response_buf, size_t bufsz)
{
    long ts = now_ms();
    if (!g_out) g_out = stdout;
    
    /* Emit REQ */
    if (json_data && *json_data) {
        fprintf(g_out, "{\"v\":1,\"type\":\"REQ\",\"kind\":\"%s\",\"id\":%d,\"ts\":%ld,\"data\":%s}\n",
                kind, req_id, ts, json_data);
    } else {
        fprintf(g_out, "{\"v\":1,\"type\":\"REQ\",\"kind\":\"%s\",\"id\":%d,\"ts\":%ld}\n",
                kind, req_id, ts);
    }
    fflush(g_out);
    
    /* Block waiting for RESP with matching corr */
    response_buf[0] = '\0';
    while (fgets(response_buf, bufsz, stdin)) {
        int corr = parse_json_field_int(response_buf, "corr");
        if (corr == req_id) {
            /* Got our response */
            return;
        }
        /* Else: wrong correlation ID or event; discard and continue */
        /* TODO M2+: Queue events for later processing */
    }
}

/* ========================================================================
 * WINDOW PORT API: INITIALIZATION
 * ======================================================================== */

static void
headless_init_nhwindows(int *argcp, char **argv)
{
    g_out = stdout;
    g_initialized = 1;
    
    /* Emit startup event */
    emit_event("INIT", "{\"engine\":\"EasyNetHack\",\"version\":\"3.6.7-headless\"}");
}

static void
headless_player_selection(void)
{
    /* Handled via prompts in M1; for now just use defaults */
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
    /* no-op for M1 */
}

static void
headless_display_nhwindow(winid window, BOOLEAN_P blocking)
{
    /* no-op for M1 */
}

static void
headless_destroy_nhwindow(winid window)
{
    /* no-op for M1 */
}

static void
headless_curs(winid window, int x, int y)
{
    /* M2: emit CURSOR event */
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
 * WINDOW PORT API: MAP (stubs for M1, implemented in M2)
 * ======================================================================== */

static void
headless_print_glyph(winid window, XCHAR_P x, XCHAR_P y, int glyph, int bkglyph)
{
    /* M2: batch into MAP_FRAME */
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

static int
headless_nhgetch(void)
{
    /* M2: handle key input */
    return '\033'; /* ESC for now */
}

static int
headless_nh_poskey(int *x, int *y, int *mod)
{
    /* M2: handle positional input */
    return '\033';
}

/* ========================================================================
 * WINDOW PORT API: PROMPTS (M1 implementation)
 * ======================================================================== */

static char
headless_yn_function(const char *question, const char *choices, CHAR_P def)
{
    /* Generate PROMPT_YN request */
    int req_id = g_next_req_id++;
    
    char escaped_q[4096];
    char escaped_choices[128];
    char escaped_def[16];
    
    json_escape(question, escaped_q, sizeof(escaped_q));
    json_escape(choices, escaped_choices, sizeof(escaped_choices));
    
    char def_str[2] = {def, '\0'};
    json_escape(def_str, escaped_def, sizeof(escaped_def));
    
    char req_data[8192];
    snprintf(req_data, sizeof(req_data), 
             "{\"q\":\"%s\",\"choices\":\"%s\",\"def\":\"%s\"}",
             escaped_q, escaped_choices, escaped_def);
    
    char response[16384];
    send_request("PROMPT_YN", req_id, req_data, response, sizeof(response));
    
    /* Parse response for "ch" field */
    char ch_str[16];
    if (parse_json_field_str(response, "ch", ch_str, sizeof(ch_str))) {
        if (ch_str[0]) return ch_str[0];
    }
    
    /* Default on parse failure */
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
    /* M3: extended command menu */
    return -1;
}

/* ========================================================================
 * WINDOW PORT API: MENUS (stubs for M1, implemented in M3)
 * ======================================================================== */

static void
headless_start_menu(winid window)
{
    /* M3: menu implementation */
}

static void
headless_add_menu(winid window, int glyph, const ANY_P *identifier,
                  CHAR_P accelerator, CHAR_P group_accel, int attr,
                  const char *str, BOOLEAN_P presel)
{
    /* M3: menu items */
}

static void
headless_end_menu(winid window, const char *prompt)
{
    /* M3: finalize menu */
}

static int
headless_select_menu(winid window, int how, MENU_ITEM_P **selected)
{
    /* M3: menu selection */
    return 0;
}

/* ========================================================================
 * WINDOW PORT API: STATUS (stubs for M1, implemented in M4)
 * ======================================================================== */

static void
headless_status_init(void)
{
    /* M4: status initialization */
}

static void
headless_status_finish(void)
{
    /* M4: status cleanup */
}

static void
headless_status_enablefield(int fieldidx, const char *nm, const char *fmt, BOOLEAN_P enable)
{
    /* M4: configure status fields */
}

static void
headless_status_update(int idx, genericptr_t ptr, int chg, int percent)
{
    /* M4: emit STATUS event */
}

/* ========================================================================
 * WINDOW PORT API: MISCELLANEOUS
 * ======================================================================== */

static void
headless_mark_synch(void)
{
    /* Flush any batched output */
    if (g_out) fflush(g_out);
}

static void
headless_wait_synch(void)
{
    /* Block until client acknowledges - for M1, just flush */
    headless_mark_synch();
}

static void
headless_cliparound(int x, int y)
{
    /* M2: handle map viewport */
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

/* ========================================================================
 * WINDOW PORT STRUCTURE
 * ======================================================================== */

struct window_procs headless_procs = {
    "headless",                     /* name */
    WC_COLOR | WC_HILITE_PET        /* wincap1 */
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
        | WC2_HITPOINTBAR | WC2_FLUSH_STATUS
        | WC2_URGENT_MESG | WC2_SUPPRESS_HIST,
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
    headless_nhbell,                /* TODO: emit BELL event */
    headless_doprev_message,        /* TODO: M5 */
    headless_yn_function,
    headless_getlin,
    headless_get_ext_cmd,
    headless_number_pad,            /* TODO */
    headless_delay_output,
    headless_change_color,
    headless_get_color_string,
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
    headless_status_threshold,
    headless_can_suspend_yes,
};

/* ========================================================================
 * STUBS FOR MISSING FUNCTIONS
 * ======================================================================== */

void
headless_nhbell(void)
{
    emit_event("BELL", NULL);
}

void
headless_doprev_message(void)
{
    /* M5: previous message */
}

void
headless_number_pad(int state)
{
    /* M2: numpad configuration */
}

#endif /* HEADLESS */
/*winheadless.c*/
