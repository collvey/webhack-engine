/* Main entry point for NetHack Headless Window Port (WASM/Emscripten build)
 * Based on unixmain.c with minimal changes for headless/WASM
 */

#include "hack.h"
#include "dlb.h"

#include <ctype.h>
#include <sys/stat.h>
#include <errno.h>
#include <string.h>
#include <emscripten.h>

/* Verify filesystem is ready (initialized by worker.js before main()) */
void wasm_init_filesystem(void) {
    int mount_exists = EM_ASM_INT({
        try {
            FS.stat('/nethack_data');
            return 1;
        } catch(e) {
            console.error('[wasm_init_filesystem] /nethack_data not mounted!', e);
            return 0;
        }
    });
    
    if (!mount_exists) {
        fprintf(stderr, "[wasm_init_filesystem] ERROR: Filesystem not initialized!\n");
    }
}

/* Clean up stale lock files from previous session
 * Lock files (1lock.0, 1lock.1, etc.) are temporary level storage during gameplay.
 * If the browser was closed without proper game exit, these files persist in IndexedDB.
 * When restoring from a save file, dorecover() will extract fresh lock files from
 * the .sav, so any pre-existing lock files are stale and should be deleted.
 */
void wasm_cleanup_stale_lockfiles(void) {
    int files_deleted = EM_ASM_INT({
        var count = 0;
        try {
            var files = FS.readdir('/nethack_data');
            
            for (var i = 0; i < files.length; i++) {
                var filename = files[i];
                
                if (filename === '.' || filename === '..') {
                    continue;
                }
                
                // Match lock files: "lock", "1lock", "lock.N", "1lock.N"
                var isLockFile = false;
                if (filename === 'lock' || filename === '1lock') {
                    isLockFile = true;
                } else if (filename.indexOf('lock.') === 0 || filename.indexOf('1lock.') === 0) {
                    isLockFile = true;
                }
                
                if (isLockFile) {
                    try {
                        var path = '/nethack_data/' + filename;
                        var stat = FS.stat(path);
                        if (FS.isFile(stat.mode)) {
                            FS.unlink(path);
                            count++;
                        }
                    } catch(e) {
                        console.error('[wasm_cleanup] Failed to delete', filename + ':', e);
                    }
                }
            }
            
            if (count > 0) {
                console.log('[wasm_cleanup] Deleted', count, 'stale lock file(s)');
            }
            
        } catch(e) {
            console.error('[wasm_cleanup] Error:', e);
        }
        
        return count;
    });
    
    if (files_deleted > 0) {
        /* Sync deletion to IndexedDB */
        EM_ASM({
            FS.syncfs(false, function(err) {
                if (err) {
                    console.error('[wasm_cleanup] Sync failed:', err);
                }
            });
        });
    }
}

/* Early WASM initialization - called from worker before main()
 * This sets up the environment so file operations work correctly:
 * 1. Initializes file path prefixes (fqn_prefix[]) for fqname() 
 * 2. Cleans up stale lock files from previous session
 * 
 * MUST be called after filesystem mount/sync but before any file operations
 * like list_save_slots(), init_save_slots(), etc.
 */
EMSCRIPTEN_KEEPALIVE
void wasm_early_init(void) {
    static boolean early_init_done = FALSE;
    
    if (early_init_done) {
        return;
    }
    
    /* Step 1: Initialize file path prefixes for fqname() */
    
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
    
    /* Step 2: Clean up stale lock files from previous session
     * Lock files are only valid during active gameplay. When the page loads,
     * any lock files in IndexedDB are stale (from crashed/closed browser).
     * Do this early so the filesystem is clean before any game operations.
     */
    wasm_cleanup_stale_lockfiles();
    
    early_init_done = TRUE;
}

/* Sync saves to IndexedDB (call after NetHack saves) */
void wasm_sync_saves(void) {
    EM_ASM(
        FS.syncfs(false, function(err) {
            if (err) {
                console.error('Failed to sync saves:', err);
            }
        });
    );
}

int main(int argc, char* argv[]) {
    int fd;
    boolean resuming = FALSE;
    
    /* Verify IndexedDB filesystem is ready */
    wasm_init_filesystem();

    /* Set program name and PID (from unixmain.c) */
    hname = argv[0];
    hackpid = getpid();
    
    /* Choose headless window system */
    choose_windows("headless");
    
    /* Initialize window port */
    init_nhwindows(&argc, argv);
    
    /* Set up options */
    initoptions();
    
    /* Run early initialization (may have already been called from worker)
     * This initializes file prefixes and cleans up stale lock files */
    wasm_early_init();
    
    /* Initialize game data files (MUST be before vision_init) */
    dlb_init();
    
    /* Initialize vision system (MUST be before mklev/newgame) */
    /* This sets up all the vision arrays that vision_reset() needs */
    vision_init();
    
    /* Create game windows (WIN_MAP, WIN_MESSAGE, etc.) */
    display_gamewindows();
    
    /* Set default player name so we have a save filename to check */
    strcpy(plname, "player");
    
    /* Generate save file name and check if it exists */
    set_savefile_name(TRUE);
    
    {
        const char *fq_save = fqname(SAVEF, SAVEPREFIX, 0);
        struct stat st;
        
        if (stat(fq_save, &st) == 0) {
            /* Try to restore the saved game */
            fd = restore_saved_game();
            
            if (fd >= 0 && dorecover(fd)) {
                /* Sync extracted lock files to IndexedDB */
                EM_ASM({
                    FS.syncfs(false, function(err) {
                        if (err) {
                            console.error('[main] Lock file sync failed:', err);
                        }
                    });
                });
                
                resuming = TRUE;
            }
        }
    }
    
    if (!resuming) {
        /* Apply character options from JavaScript (if provided) */
        extern int apply_character_options_from_js(void);
        int opts_applied = apply_character_options_from_js();
        
        /* Set up character and start new game */
        player_selection();
        newgame();
    }
    
    /* Start the game loop */
    moveloop(resuming);
    
    /* Clean exit */
    exit_nhwindows((char *)0);
    nh_terminate(EXIT_SUCCESS);
    
    return 0;
}
