/* Main entry point for NetHack Headless Window Port
 * Supports both native (stdio) and WASM (Emscripten) builds
 * Based on unixmain.c with minimal changes for headless/WASM
 */

#include "hack.h"
#include "dlb.h"

#include <ctype.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>

/* Initialize Emscripten filesystem with IDBFS for save persistence */
void wasm_init_filesystem(void) {
    EM_ASM(
        // Create mount point for NetHack data
        try {
            FS.mkdir('/nethack_data');
        } catch(e) {
            console.log('Directory /nethack_data already exists');
        }
        FS.mount(IDBFS, {}, '/nethack_data');
        
        // Load existing saves from IndexedDB (async in JS, but C continues)
        FS.syncfs(true, function(err) {
            if (err) {
                console.error('Failed to load saves from IndexedDB:', err);
            } else {
                console.log('Saves loaded from IndexedDB');
            }
        });
    );
}

/* Sync saves to IndexedDB (call after NetHack saves) */
void wasm_sync_saves(void) {
    EM_ASM(
        FS.syncfs(false, function(err) {
            if (err) {
                console.error('Failed to sync saves to IndexedDB:', err);
            } else {
                console.log('Saves synced to IndexedDB');
            }
        });
    );
}
#endif /* __EMSCRIPTEN__ */

int main(int argc, char* argv[]) {
#ifdef __EMSCRIPTEN__
    /* WASM build: Initialize IndexedDB filesystem first */
    wasm_init_filesystem();
#endif

    /* Set program name and PID (from unixmain.c) */
    hname = argv[0];
    hackpid = getpid();
    
    /* Choose headless window system */
    choose_windows("headless");
    
    /* Initialize window port */
    init_nhwindows(&argc, argv);
    
    /* Set up options */
    initoptions();
    
    /* Set up file prefixes for save/level files (from unixmain.c) */
#ifdef VAR_PLAYGROUND
    {
        int len = strlen(VAR_PLAYGROUND);
        fqn_prefix[SCOREPREFIX] = (char *) alloc(len + 2);
        Strcpy(fqn_prefix[SCOREPREFIX], VAR_PLAYGROUND);
        if (fqn_prefix[SCOREPREFIX][len - 1] != '/') {
            fqn_prefix[SCOREPREFIX][len] = '/';
            fqn_prefix[SCOREPREFIX][len + 1] = '\0';
        }
        /* Point all file prefixes to VAR_PLAYGROUND */
        fqn_prefix[LEVELPREFIX] = fqn_prefix[SCOREPREFIX];
        fqn_prefix[SAVEPREFIX] = fqn_prefix[SCOREPREFIX];
        fqn_prefix[BONESPREFIX] = fqn_prefix[SCOREPREFIX];
        fqn_prefix[LOCKPREFIX] = fqn_prefix[SCOREPREFIX];
        fqn_prefix[TROUBLEPREFIX] = fqn_prefix[SCOREPREFIX];
    }
#endif
    
    /* Initialize game data files (MUST be before vision_init) */
    dlb_init();
    
    /* Initialize vision system (MUST be before mklev/newgame) */
    /* This sets up all the vision arrays that vision_reset() needs */
    vision_init();
    
    /* Create game windows (WIN_MAP, WIN_MESSAGE, etc.) */
    display_gamewindows();
    
    /* Set up character (headless needs this done explicitly) */
    player_selection();
    
    /* Start new game */
    newgame();
    
    /* Start the game loop */
    moveloop(FALSE);
    
    /* Clean exit */
    exit_nhwindows((char *)0);
    nh_terminate(EXIT_SUCCESS);
    
    return 0;
}
