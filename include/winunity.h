/*
 * winunity.h - Unity window port interface for EasyNetHack
 * Initial scaffolding for migration (M0)
 */
#ifndef WINUNITY_H
#define WINUNITY_H

#ifdef __cplusplus
extern "C" {
#endif

/* Minimal placeholder types for initial scaffolding.
   These will be expanded in M1–M4 to match the design doc. */
typedef enum {
    NH_EVT_NONE = 0,
    NH_EVT_INIT = 1
} NHEventType;

typedef struct NHEvent {
    int type; /* NHEventType */
    int tick;
} NHEvent;

typedef enum {
    NH_IN_NONE = 0
} NHInputType;

typedef struct NHInput {
    int type; /* NHInputType */
    int tick;
} NHInput;

/* Adapter C ABI (DLL exports), implemented in win/unity/adapter.c */
__declspec(dllexport) int __cdecl nh_unity_init(const char *playground_dir);
__declspec(dllexport) int __cdecl nh_unity_start_new_game(const char *options_json);
__declspec(dllexport) int __cdecl nh_unity_load_save(const char *save_path);
__declspec(dllexport) void __cdecl nh_unity_shutdown(void);
__declspec(dllexport) int __cdecl nh_unity_poll_event(struct NHEvent *out_event);
__declspec(dllexport) int __cdecl nh_unity_wait_event(struct NHEvent *out_event, int timeout_ms);
__declspec(dllexport) int __cdecl nh_unity_push_input(const struct NHInput *in_event);
__declspec(dllexport) int __cdecl nh_unity_get_map_size(int *out_w, int *out_h);

#ifdef __cplusplus
}
#endif

#endif /* WINUNITY_H */
