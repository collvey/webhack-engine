/* Main entry point for NetHack Headless Window Port
 * Supports both native (stdio) and WASM (Emscripten) builds
 * Based on unixmain.c with minimal changes for headless/WASM
 */

#include "hack.h"
#include "dlb.h"

#include <ctype.h>
#include <sys/stat.h>
#include <errno.h>
#include <string.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>

/* Check if filesystem has been initialized
 * NOTE: The filesystem is now initialized by the JavaScript worker
 * BEFORE main() is called, so this just verifies it's ready
 */
void wasm_init_filesystem(void) {
    fprintf(stderr, "[wasm_init_filesystem] Verifying filesystem is ready...\n");
    
    /* Check if /nethack_data mount exists */
    int mount_exists = EM_ASM_INT({
        try {
            var stat = FS.stat('/nethack_data');
            console.log('[C→JS] /nethack_data exists, ready to use');
            return 1;
        } catch(e) {
            console.error('[C→JS] /nethack_data does NOT exist!', e);
            return 0;
        }
    });
    
    if (mount_exists) {
        fprintf(stderr, "[wasm_init_filesystem] ✓ Filesystem is ready\n");
        
        /* Debug: List files in /nethack_data */
        fprintf(stderr, "[wasm_init_filesystem] Listing files in /nethack_data...\n");
        EM_ASM({
            try {
                var files = FS.readdir('/nethack_data');
                console.log('[C→JS] Files in /nethack_data:', files);
                files.forEach(function(f) {
                    if (f !== '.' && f !== '..') {
                        try {
                            var stat = FS.stat('/nethack_data/' + f);
                            console.log('[C→JS]   -', f, 'size:', stat.size, 'bytes');
                        } catch(e) {
                            console.log('[C→JS]   -', f, '(directory)');
                        }
                    }
                });
            } catch(e) {
                console.error('[C→JS] Error listing /nethack_data:', e);
            }
        });
    } else {
        fprintf(stderr, "[wasm_init_filesystem] ✗ WARNING: Filesystem not initialized!\n");
        fprintf(stderr, "[wasm_init_filesystem] This should not happen - check worker.js\n");
    }
    
    fprintf(stderr, "[wasm_init_filesystem] Verification complete\n\n");
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
    int fd;
    boolean resuming = FALSE;
    
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
    
    /* ========================================================================
     * SAVE FILE DETECTION AT STARTUP (modeled after unixmain.c)
     * ======================================================================== */
    
    fprintf(stderr, "\n[main_wasm] ========== SAVE FILE DETECTION ==========\n");
    
    /* Set default player name so we have a save filename to check
     * This will be overridden later if we start a new game */
    strcpy(plname, "player");
    fprintf(stderr, "[main_wasm] Default plname set to: '%s'\n", plname);
    
    /* Generate save file name (e.g., "save" or based on plname)
     * This populates the global SAVEF variable */
    set_savefile_name(TRUE);
    fprintf(stderr, "[main_wasm] SAVEF set to: '%s'\n", SAVEF);
    
    /* Get the full path with prefix (/nethack_data/...) */
    {
        const char *fq_save = fqname(SAVEF, SAVEPREFIX, 0);
        fprintf(stderr, "[main_wasm] Full save path (with prefix): '%s'\n", fq_save);
        
        /* Debug: List what files are actually in the directory */
        fprintf(stderr, "[main_wasm] Listing files in /nethack_data to verify filesystem state...\n");
        EM_ASM({
            try {
                var files = FS.readdir('/nethack_data');
                console.log('[JS] Files in /nethack_data:', files);
                for (var i = 0; i < files.length; i++) {
                    if (files[i] !== '.' && files[i] !== '..') {
                        try {
                            var path = '/nethack_data/' + files[i];
                            var stat = FS.stat(path);
                            console.log('[JS]   -', files[i], '(size:', stat.size, 'bytes)');
                        } catch(e) {
                            console.log('[JS]   -', files[i], '(directory or inaccessible)');
                        }
                    }
                }
            } catch(e) {
                console.error('[JS] Failed to list /nethack_data:', e);
            }
        });
        
        fprintf(stderr, "[main_wasm] Now checking if file exists with stat(): '%s'\n", fq_save);
        
        /* Check if save file exists using stat() */
        struct stat st;
        if (stat(fq_save, &st) == 0) {
            fprintf(stderr, "[main_wasm] ✓ SUCCESS: Save file EXISTS at '%s'\n", fq_save);
            fprintf(stderr, "[main_wasm]   File size: %ld bytes\n", (long)st.st_size);
            fprintf(stderr, "[main_wasm]   Attempting to restore saved game...\n");
            
            /* Try to restore the saved game */
            fd = restore_saved_game();
            
            if (fd >= 0) {
                fprintf(stderr, "[main_wasm] ✓ SUCCESS: Save file opened (fd=%d)\n", fd);
                fprintf(stderr, "[main_wasm]   Calling dorecover() to restore game state...\n");
                
                /* Restore the game state from the save file */
                if (dorecover(fd)) {
                    fprintf(stderr, "[main_wasm] ✓ SUCCESS: Game restored from save file!\n");
                    fprintf(stderr, "[main_wasm]   Character name: %s\n", plname);
                    fprintf(stderr, "[main_wasm]   Resuming saved game...\n");
                    resuming = TRUE;
                } else {
                    fprintf(stderr, "[main_wasm] ✗ FAILED: dorecover() returned false\n");
                    fprintf(stderr, "[main_wasm]   Save file may be corrupt or incompatible\n");
                    fprintf(stderr, "[main_wasm]   Starting new game instead\n");
                }
            } else {
                fprintf(stderr, "[main_wasm] ✗ FAILED: restore_saved_game() couldn't open file\n");
                fprintf(stderr, "[main_wasm]   Return value: %d\n", fd);
                fprintf(stderr, "[main_wasm]   Error code: %d (%s)\n", errno, strerror(errno));
                fprintf(stderr, "[main_wasm]   Starting new game instead\n");
            }
        } else {
            fprintf(stderr, "[main_wasm] ✗ NOTICE: Save file NOT FOUND at '%s'\n", fq_save);
            fprintf(stderr, "[main_wasm]   stat() error: %d (%s)\n", errno, strerror(errno));
            fprintf(stderr, "[main_wasm]   This is normal for first-time play\n");
            fprintf(stderr, "[main_wasm]   Starting new game...\n");
        }
    }
    
    fprintf(stderr, "[main_wasm] ==================================================\n\n");
    
    /* ========================================================================
     * START NEW GAME OR RESUME
     * ======================================================================== */
    
    if (!resuming) {
        fprintf(stderr, "[main_wasm] Starting NEW game...\n");
        
        /* Set up character (player chooses role, race, etc.) */
        player_selection();
        fprintf(stderr, "[main_wasm] Character created: %s\n", plname);
        
        /* Start new game */
        fprintf(stderr, "[main_wasm] Calling newgame()...\n");
        newgame();
    } else {
        fprintf(stderr, "[main_wasm] Resuming SAVED game...\n");
    }
    
    /* Start the game loop */
    fprintf(stderr, "[main_wasm] Entering moveloop(resuming=%d)...\n", resuming);
    moveloop(resuming);
    
    /* Clean exit */
    exit_nhwindows((char *)0);
    nh_terminate(EXIT_SUCCESS);
    
    return 0;
}
