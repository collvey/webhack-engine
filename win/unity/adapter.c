/* adapter.c - DLL export layer for Unity window port (M0 scaffolding) */
#include "winunity.h"

/* For now, provide no-op implementations to allow linking. */

int __cdecl nh_unity_init(const char *playground_dir) {
    (void)playground_dir;
    return 0; /* success */
}

int __cdecl nh_unity_start_new_game(const char *options_json) {
    (void)options_json;
    return 0; /* success */
}

int __cdecl nh_unity_load_save(const char *save_path) {
    (void)save_path;
    return 0; /* success */
}

void __cdecl nh_unity_shutdown(void) {
    /* no-op */
}

int __cdecl nh_unity_poll_event(struct NHEvent *out_event) {
    if (out_event) {
        out_event->type = NH_EVT_NONE;
        out_event->tick = 0;
    }
    return 0; /* no event */
}

int __cdecl nh_unity_wait_event(struct NHEvent *out_event, int timeout_ms) {
    (void)timeout_ms;
    if (out_event) {
        out_event->type = NH_EVT_NONE;
        out_event->tick = 0;
    }
    return 0; /* timeout/no event in scaffolding */
}

int __cdecl nh_unity_push_input(const struct NHInput *in_event) {
    (void)in_event;
    return 0; /* accepted */
}

int __cdecl nh_unity_get_map_size(int *out_w, int *out_h) {
    if (out_w) *out_w = 80;
    if (out_h) *out_h = 25;
    return 0;
}
