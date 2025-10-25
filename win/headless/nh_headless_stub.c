#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <ctype.h>

static int g_once = 0;

static long now_ms(void) {
    struct timespec ts;
#if defined(_WIN32)
    timespec_get(&ts, TIME_UTC);
#else
    clock_gettime(CLOCK_REALTIME, &ts);
#endif
    return (long)(ts.tv_sec * 1000L + ts.tv_nsec / 1000000L);
}

static int parse_id(const char *line) {
    const char *p = strstr(line, "\"id\"");
    if (!p) return -1;
    p = strchr(p, ':');
    if (!p) return -1;
    p++;
    while (*p && isspace((unsigned char)*p)) p++;
    int id = 0;
    int neg = 0;
    if (*p == '-') { neg = 1; p++; }
    while (*p && isdigit((unsigned char)*p)) {
        id = id * 10 + (*p - '0');
        p++;
    }
    return neg ? -id : id;
}

static void parse_kind(const char *line, char *out, size_t outsz) {
    out[0] = '\0';
    const char *p = strstr(line, "\"kind\"");
    if (!p) return;
    p = strchr(p, ':');
    if (!p) return;
    p++;
    while (*p && isspace((unsigned char)*p)) p++;
    if (*p != '"') return;
    p++;
    size_t i = 0;
    while (*p && *p != '"' && i + 1 < outsz) {
        out[i++] = *p++;
    }
    out[i] = '\0';
}

static void send_resp(FILE *out, const char *kind, int corr) {
    long ts = now_ms();
    fprintf(out, "{\"v\":1,\"type\":\"RESP\",\"kind\":\"%s\",\"corr\":%d,\"ts\":%ld}\n", kind, corr, ts);
    fflush(out);
}

static void send_event(FILE *out, const char *kind, const char *msg) {
    long ts = now_ms();
    if (msg) {
        fprintf(out, "{\"v\":1,\"type\":\"EVENT\",\"kind\":\"%s\",\"ts\":%ld,\"data\":{\"msg\":\"%s\"}}\n", kind, ts, msg);
    } else {
        fprintf(out, "{\"v\":1,\"type\":\"EVENT\",\"kind\":\"%s\",\"ts\":%ld}\n", kind, ts);
    }
    fflush(out);
}

int main(int argc, char **argv) {
    // Simple arg parsing
    for (int i = 1; i < argc; ++i) {
        if (strcmp(argv[i], "--once") == 0) {
            g_once = 1;
        } else if (strcmp(argv[i], "--stdio") == 0) {
            // no-op; default mode is stdio
        }
    }

    // Optional greeting event on startup
    send_event(stdout, "STATUS", "engine:headless_stub started");

    char buf[16384];
    while (fgets(buf, sizeof(buf), stdin)) {
        // minimal NDJSON line; parse by kind and id
        int id = parse_id(buf);
        char kind[64];
        parse_kind(buf, kind, sizeof(kind));
        if (kind[0] == '\0') {
            // Unknown or malformed; emit ERR with correlation if any
            long ts = now_ms();
            if (id < 0) id = 0;
            fprintf(stdout, "{\"v\":1,\"type\":\"ERR\",\"kind\":\"BAD_MSG\",\"corr\":%d,\"ts\":%ld,\"data\":{\"reason\":\"malformed or missing kind\"}}\n", id, ts);
            fflush(stdout);
            continue;
        }

        if (strcmp(kind, "HELLO") == 0) {
            send_resp(stdout, "WELCOME", id);
        } else if (strcmp(kind, "PING") == 0) {
            send_resp(stdout, "PONG", id);
        } else if (strcmp(kind, "QUIT") == 0) {
            send_resp(stdout, "OK", id);
            break;
        } else {
            // Unrecognized; echo an ERR but keep running
            long ts = now_ms();
            if (id < 0) id = 0;
            fprintf(stdout, "{\"v\":1,\"type\":\"ERR\",\"kind\":\"UNIMPL\",\"corr\":%d,\"ts\":%ld,\"data\":{\"msg\":\"kind not implemented\",\"kind\":\"%s\"}}\n", id, ts, kind);
            fflush(stdout);
        }
    }

    if (g_once) {
        return 0;
    }
    return 0;
}
