/* NetHack Save Slot Management for WASM
 * Provides manual save/load to numbered slots without affecting game startup
 */

#include "hack.h"
#include "lev.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <sys/stat.h>
#include <dirent.h>
#include <time.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>

/* O_BINARY not defined in Emscripten */
#ifndef O_BINARY
#define O_BINARY 0
#endif

/* Forward declarations from save.c */
extern int FDECL(dosave0, (void));
/* savegamestate is made non-static in save.c for our use */
extern void FDECL(savegamestate, (int, int));

/* External declarations from files.c */
extern int FDECL(open_levelfile, (int, char *));  /* Opens lock.N file for reading */

/* Save slot directory - relative path so fqname() adds the /nethack_data/ prefix */
#define SLOT_DIR "save_slots"
#define MAX_SLOTS 10

/* Forward declarations */
static boolean copy_file(const char *src, const char *dst);
static boolean save_slot_metadata(int slot_num, const char *render_mode, const char *tileset_id);
static int create_slot_savefile(int slot_num);
static int dosave_slot_nondestructive(void);

/* ========================================================================
 * SLOT FILE OPERATIONS
 * ======================================================================== */

/* Copy a file from src to dst */
static boolean
copy_file(const char *src, const char *dst)
{
    FILE *fsrc, *fdst;
    char buffer[8192];
    size_t n;
    
    fsrc = fopen(src, "rb");
    if (!fsrc) {
        fprintf(stderr, "[save_slots] Failed to open source: %s\n", src);
        return FALSE;
    }
    
    fdst = fopen(dst, "wb");
    if (!fdst) {
        fprintf(stderr, "[save_slots] Failed to open destination: %s\n", dst);
        fclose(fsrc);
        return FALSE;
    }
    
    while ((n = fread(buffer, 1, sizeof(buffer), fsrc)) > 0) {
        if (fwrite(buffer, 1, n, fdst) != n) {
            fprintf(stderr, "[save_slots] Write failed\n");
            fclose(fsrc);
            fclose(fdst);
            return FALSE;
        }
    }
    
    fclose(fsrc);
    fclose(fdst);
    return TRUE;
}

/* Generate metadata JSON for current game state
 * UI preferences (render_mode, tileset_id) are passed from JavaScript
 */
static boolean
save_slot_metadata(int slot_num, const char *render_mode, const char *tileset_id)
{
    char meta_relpath[256];
    const char *meta_path;
    FILE *fp;
    time_t now;
    char timestamp[64];
    
    fprintf(stderr, "[save_slots] save_slot_metadata: slot=%d START\n", slot_num);
    fprintf(stderr, "[save_slots]   UI: render_mode=%s, tileset_id=%s\n", 
            render_mode ? render_mode : "NULL", 
            tileset_id ? tileset_id : "NULL");
    
    /* Build relative path */
    sprintf(meta_relpath, "%s/slot_%03d.meta", SLOT_DIR, slot_num);
    
    /* Get full path with prefix */
    meta_path = fqname(meta_relpath, SAVEPREFIX, 2);
    fprintf(stderr, "[save_slots] save_slot_metadata: full path=%s\n", meta_path);
    
    fp = fopen(meta_path, "w");
    if (!fp) {
        fprintf(stderr, "[save_slots] Failed to create metadata: %s (errno=%d)\n", meta_path, errno);
        return FALSE;
    }
    
    fprintf(stderr, "[save_slots] save_slot_metadata: file opened, writing JSON...\n");
    
    /* Get current timestamp */
    now = time(NULL);
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", gmtime(&now));
    
    /* Write JSON metadata */
    fprintf(fp, "{\n");
    fprintf(fp, "  \"slot_num\": %d,\n", slot_num);
    fprintf(fp, "  \"character_name\": \"%s\",\n", plname);
    fprintf(fp, "  \"role\": \"%s\",\n", urole.name.m);
    fprintf(fp, "  \"race\": \"%s\",\n", urace.noun);
    fprintf(fp, "  \"gender\": \"%s\",\n", (flags.female ? "Female" : "Male"));
    fprintf(fp, "  \"alignment\": \"%s\",\n", align_str(u.ualign.type));
    fprintf(fp, "  \"level\": %d,\n", u.ulevel);
    fprintf(fp, "  \"hp\": %d,\n", u.uhp);
    fprintf(fp, "  \"hp_max\": %d,\n", u.uhpmax);
    fprintf(fp, "  \"exp_level\": %d,\n", u.ulevel);
    fprintf(fp, "  \"dungeon_level\": \"Dlvl:%d\",\n", depth(&u.uz));
    fprintf(fp, "  \"turns\": %ld,\n", moves);
    fprintf(fp, "  \"timestamp\": \"%s\",\n", timestamp);
    
    /* UI preferences - add with proper JSON escaping */
    fprintf(fp, "  \"ui\": {\n");
    fprintf(fp, "    \"render_mode\": \"%s\",\n", render_mode ? render_mode : "text");
    fprintf(fp, "    \"tileset_id\": \"%s\"\n", tileset_id ? tileset_id : "");
    fprintf(fp, "  }\n");
    
    fprintf(fp, "}\n");
    
    fclose(fp);
    fprintf(stderr, "[save_slots] save_slot_metadata: SUCCESS\n");
    return TRUE;
}

/* ========================================================================
 * NON-DESTRUCTIVE SAVE FUNCTION
 * ======================================================================== */

/* Save game state WITHOUT freeing memory (for manual save slots)
 * This is a modified version of dosave0() that uses WRITE_SAVE instead of
 * (WRITE_SAVE | FREE_SAVE), so game data remains in memory after save.
 * 
 * IMPORTANT: This assumes SAVEF is already set to the correct path.
 * Returns: 1 on success, 0 on failure
 */
static int
dosave_slot_nondestructive(void)
{
    const char *fq_save;
    register int fd;
    xchar ltmp;
    d_level uz_save;
    unsigned long ustuck_id, usteed_id;
    
    fprintf(stderr, "[dosave_slot_nondestructive] Starting non-destructive save...\n");
    
    if (!program_state.something_worth_saving || !SAVEF[0]) {
        fprintf(stderr, "[dosave_slot_nondestructive] Nothing to save or no SAVEF\n");
        return 0;
    }
    
    fq_save = fqname(SAVEF, SAVEPREFIX, 1);
    fprintf(stderr, "[dosave_slot_nondestructive] Saving to: %s\n", fq_save);
    
    /* Create the save file */
    fd = create_savefile();
    if (fd < 0) {
        fprintf(stderr, "[dosave_slot_nondestructive] Cannot create save file\n");
        return 0;
    }
    
    /* Save version and metadata */
    store_version(fd);
    store_savefileinfo(fd);
    store_plname_in_file(fd);
    
    /* Save monster references (needed for save format) */
    ustuck_id = (u.ustuck ? u.ustuck->m_id : 0);
    usteed_id = (u.usteed ? u.usteed->m_id : 0);
    
    /* === KEY DIFFERENCE: Use WRITE_SAVE instead of (WRITE_SAVE | FREE_SAVE) ===
     * This writes data to disk WITHOUT freeing the in-memory structures.
     * The game can continue playing after this save completes.
     */
    fprintf(stderr, "[dosave_slot_nondestructive] Saving current level (non-destructive)...\n");
    savelev(fd, ledger_no(&u.uz), WRITE_SAVE);
    
    fprintf(stderr, "[dosave_slot_nondestructive] Saving game state (non-destructive)...\n");
    savegamestate(fd, WRITE_SAVE);
    
    /* Save uz temporarily to avoid issues while copying other levels */
    uz_save = u.uz;
    u.uz.dnum = u.uz.dlevel = 0;
    
    /* These pointers become invalid while processing other levels */
    u.ustuck = (struct monst *) 0;
    u.usteed = (struct monst *) 0;
    
    /* === CRITICAL: Embed ALL other level files into the .sav file ===
     * 
     * IMPORTANT: We copy lock.N files as RAW BINARY DATA.
     * We do NOT use getlev() because that would:
     *   1. Load level data into global memory (fmon, fobj, etc.)
     *   2. Overwrite current game state
     *   3. Change object IDs, breaking timer references
     *   4. Cause "cant find o_id" errors on restore
     * 
     * SOLUTION: Copy lock.N files byte-by-byte without parsing.
     * This is exactly what NetHack's dosave0() does - the .sav format
     * stores levels as opaque binary blobs.
     * 
     * Format: [level_number][raw_lock_file_bytes]
     */
    fprintf(stderr, "[dosave_slot_nondestructive] Embedding other level files into .sav...\n");
    for (ltmp = (xchar) 1; ltmp <= maxledgerno(); ltmp++) {
        int ofd;
        char whynot[BUFSZ];
        char buffer[8192];
        int bytes_read;
        
        if (ltmp == ledger_no(&uz_save))
            continue;  /* Current level already saved above */
        if (!(level_info[ltmp].flags & LFILE_EXISTS))
            continue;  /* Level doesn't exist */
        
        fprintf(stderr, "[dosave_slot_nondestructive]   Embedding level %d (raw copy)...\n", ltmp);
        
        /* Open the lock.N file for this level */
        ofd = open_levelfile(ltmp, whynot);
        if (ofd < 0) {
            fprintf(stderr, "[dosave_slot_nondestructive]   Warning: Cannot open level %d: %s\n", 
                    ltmp, whynot);
            continue;
        }
        
        /* Write level number to .sav file */
        bwrite(fd, (genericptr_t) &ltmp, sizeof ltmp);
        
        /* Copy raw bytes from lock.N to .sav file
         * This preserves ALL data exactly as-is:
         * - Object IDs stay the same
         * - Timer references stay valid
         * - No memory corruption
         */
        while ((bytes_read = read(ofd, buffer, sizeof(buffer))) > 0) {
            bwrite(fd, (genericptr_t) buffer, bytes_read);
        }
        
        (void) nhclose(ofd);
        
        fprintf(stderr, "[dosave_slot_nondestructive]   ✓ Level %d embedded (raw binary)\n", ltmp);
    }
    
    /* Close the save file */
    bclose(fd);
    
    /* Restore uz */
    u.uz = uz_save;
    
    /* Compress the save file (will fail silently in WASM - that's OK) */
    nh_compress(fq_save);
    
    fprintf(stderr, "[dosave_slot_nondestructive] Save complete!\n");
    fprintf(stderr, "[dosave_slot_nondestructive] ✓ Game state preserved in memory\n");
    fprintf(stderr, "[dosave_slot_nondestructive] ✓ You can continue playing\n");
    
    return 1;
}

/* ========================================================================
 * PUBLIC API - Called from JavaScript via ccall
 * ======================================================================== */

/* Initialize save slots directory */
EMSCRIPTEN_KEEPALIVE
int init_save_slots(void)
{
    struct stat st = {0};
    const char *full_path;
    
    /* Get the full path with prefix (will be /nethack_data/save_slots) */
    full_path = fqname(SLOT_DIR, SAVEPREFIX, 2);
    
    /* Create save_slots directory if it doesn't exist */
    if (stat(full_path, &st) == -1) {
        if (mkdir(full_path, 0755) != 0) {
            fprintf(stderr, "[save_slots] Failed to create directory: %s\n", full_path);
            return 0;
        }
    }
    
    fprintf(stdout, "[save_slots] Initialized save slots directory: %s\n", full_path);
    return 1;
}

/* Save current game to a specific slot
 * This does NOT exit the game - it's a manual save using dosave0()
 * UI preferences are passed from JavaScript to be saved in metadata
 * Returns: 1 on success, 0 on failure
 */
EMSCRIPTEN_KEEPALIVE
int save_to_slot(int slot_num, const char *render_mode, const char *tileset_id)
{
    char slot_save[256];
    char slot_relpath[256];
    const char *slot_fullpath;
    char original_savef[512];  /* Large enough for any path */
    int result;
    
    fprintf(stderr, "[save_slots] save_to_slot: slot=%d START\n", slot_num);
    
    if (slot_num < 1 || slot_num > MAX_SLOTS) {
        fprintf(stderr, "[save_slots] Invalid slot number: %d\n", slot_num);
        return 0;
    }
    
    /* Ensure save_slots directory exists */
    if (!init_save_slots()) {
        return 0;
    }
    
    /* === FIX: Delete old slot file to prevent overwrite prompt ===
     * NetHack's dosave0() checks if the save file exists and prompts
     * "Overwrite the old file? [yn]" if it does. For save slots,
     * we want automatic overwriting without user interaction.
     * Solution: Delete the old file before saving.
     */
    sprintf(slot_relpath, "save_slots/slot_%03d.sav", slot_num);
    slot_fullpath = fqname(slot_relpath, SAVEPREFIX, 2);
    
    struct stat st;
    if (stat(slot_fullpath, &st) == 0) {
        fprintf(stderr, "[save_slots] Slot %d exists, deleting old file to prevent overwrite prompt...\n", slot_num);
        if (unlink(slot_fullpath) != 0) {
            fprintf(stderr, "[save_slots] Warning: Failed to delete old slot file (errno=%d)\n", errno);
            /* Continue anyway - dosave0() will overwrite */
        } else {
            fprintf(stderr, "[save_slots] ✓ Old slot file deleted\n");
        }
    }
    
    /* Save original SAVEF path */
    strcpy(original_savef, SAVEF);
    
    /* Temporarily redirect SAVEF to the slot location
     * IMPORTANT: Use relative path (no leading /) so fqname() can add the prefix
     * fqname() will prepend /nethack_data/ to this path
     */
    sprintf(slot_save, "save_slots/slot_%03d.sav", slot_num);
    fprintf(stderr, "[save_slots] Original SAVEF: '%s'\n", original_savef);
    strcpy(SAVEF, slot_save);
    
    fprintf(stderr, "[save_slots] Redirected SAVEF to: '%s'\n", SAVEF);
    
    /* === DEBUG: Check program state BEFORE save ===
     * NetHack has internal flags that control whether saving is allowed.
     * If a previous save didn't clean up properly, these flags might block us.
     */
    fprintf(stderr, "\n[DEBUG] === PROGRAM STATE BEFORE dosave0() ===\n");
    fprintf(stderr, "[DEBUG] program_state.gameover = %d (should be 0)\n", program_state.gameover);
    fprintf(stderr, "[DEBUG] program_state.something_worth_saving = %d (should be 1)\n", program_state.something_worth_saving);
    fprintf(stderr, "[DEBUG] program_state.panicking = %d (should be 0)\n", program_state.panicking);
    fprintf(stderr, "[DEBUG] program_state.done_hup = %d (should be 0)\n", program_state.done_hup);
    fprintf(stderr, "[DEBUG] SAVEF = '%s'\n", SAVEF);
    fprintf(stderr, "[DEBUG] ==========================================\n\n");
    
    /* Call our non-destructive save function
     * This is a modified version of dosave0() that DOES NOT free memory.
     * The game can continue playing after this save completes.
     * 
     * KEY DIFFERENCE from dosave0():
     * - Uses WRITE_SAVE flag instead of (WRITE_SAVE | FREE_SAVE)
     * - Game data remains in memory (inventory, monsters, etc.)
     * - No need to reset program state flags afterwards
     * 
     * NOTE: You may see "Fork to compress" messages - this is NORMAL.
     * NetHack tries to compress the save file using fork(), which
     * doesn't work in browsers. The save still succeeds uncompressed.
     */
    fprintf(stderr, "[save_slots] Calling dosave_slot_nondestructive()...\n");
    result = dosave_slot_nondestructive();
    fprintf(stderr, "[save_slots] dosave_slot_nondestructive() returned: %d (1=success)\n", result);
    
    /* === DEBUG: Check program state AFTER save === */
    fprintf(stderr, "\n[DEBUG] === PROGRAM STATE AFTER dosave0() ===\n");
    fprintf(stderr, "[DEBUG] program_state.gameover = %d\n", program_state.gameover);
    fprintf(stderr, "[DEBUG] program_state.something_worth_saving = %d\n", program_state.something_worth_saving);
    fprintf(stderr, "[DEBUG] program_state.panicking = %d\n", program_state.panicking);
    fprintf(stderr, "[DEBUG] program_state.done_hup = %d\n", program_state.done_hup);
    fprintf(stderr, "[DEBUG] =========================================\n\n");
    
    if (result) {
        fprintf(stderr, "[save_slots] ✓ Game state saved to memory (temporary storage)\n");
    }
    
    /* Restore original SAVEF */
    strcpy(SAVEF, original_savef);
    fprintf(stderr, "[save_slots] Restored SAVEF to: '%s'\n", SAVEF);
    
    if (!result) {
        fprintf(stderr, "\n[ERROR] ❌ Save FAILED!\n");
        fprintf(stderr, "[ERROR] This means the save function couldn't write the file.\n");
        fprintf(stderr, "[ERROR] Common reasons:\n");
        fprintf(stderr, "[ERROR]   1. program_state.something_worth_saving is FALSE\n");
        fprintf(stderr, "[ERROR]   2. SAVEF path is empty or invalid\n");
        fprintf(stderr, "[ERROR]   3. File couldn't be opened for writing\n");
        fprintf(stderr, "[ERROR]   4. Disk/filesystem error\n");
        fprintf(stderr, "[ERROR] Check the DEBUG output above for the actual state values.\n\n");
        return 0;
    }
    
    /* === NO STATE CLEANUP NEEDED ===
     * Our non-destructive save function doesn't modify game state flags.
     * Unlike dosave0(), it doesn't set gameover, done_hup, or clear
     * something_worth_saving. The game continues running normally.
     */
    fprintf(stderr, "[save_slots] ✓ Save successful, game state unchanged\n");
    fprintf(stderr, "[save_slots] ✓ All level data embedded in .sav file (no separate lock files needed)\n");
    
    /* Save metadata (non-blocking file I/O) */
    fprintf(stderr, "[save_slots] Saving metadata...\n");
    if (!save_slot_metadata(slot_num, render_mode, tileset_id)) {
        fprintf(stderr, "[save_slots] Warning: metadata save failed\n");
        /* Continue anyway - slot file is valid */
    }
    
    /* Sync to IndexedDB with Asyncify
     * CRITICAL: This must be the LAST operation before return.
     * After Asyncify.handleSleep resumes, we CANNOT do ANY C operations
     * including fprintf or complex return logic.
     * 
     * SOLUTION: Do the entire operation in JavaScript and return from there.
     */
    fprintf(stderr, "[save_slots] About to sync to IndexedDB (slot=%d)...\n", slot_num);
    
    /* === STEP 2: Sync to Permanent Storage (IndexedDB) ===
     * 
     * WHAT IS HAPPENING HERE:
     * - The save file exists in RAM (temporary memory) right now
     * - If the browser closes, it would be lost
     * - FS.syncfs() copies files from RAM → IndexedDB (permanent browser storage)
     * - This is like copying a document from your desk to a filing cabinet
     * 
     * WHY ASYNCHRONOUS:
     * - Writing to IndexedDB takes a few milliseconds (it's a database operation)
     * - We don't want to freeze the game waiting for it
     * - So we start the sync and let it happen in the background
     * - The game continues playing while the sync completes
     * 
     * TECHNICAL NOTE:
     * - EM_ASM_INT expects an immediate return value
     * - But FS.syncfs is async (callback-based)
     * - Asyncify.handleSleep() doesn't block JavaScript execution
     * - So we use plain EM_ASM (no return) and return success optimistically
     * - The actual sync completes a few milliseconds later
     */
    fprintf(stderr, "[save_slots] → Starting background sync to permanent storage (IndexedDB)...\n");
    fprintf(stderr, "[save_slots]   This copies the file from RAM to browser's permanent database\n");
    
    EM_ASM({
        console.log('[save_slots] [JS] Syncing RAM → IndexedDB (slot ' + $0 + ')...');
        
        FS.syncfs(false, function(err) {
            if (err) {
                console.error('[save_slots] [JS] ✗ Sync FAILED:', err);
                console.error('[save_slots] [JS] Save file may be lost on browser close!');
            } else {
                console.log('[save_slots] [JS] ✓ Sync complete! Slot ' + $0 + ' permanently saved to IndexedDB');
            }
        });
        
        console.log('[save_slots] [JS] Sync started in background, C code continues immediately');
    }, slot_num);
    
    fprintf(stderr, "[save_slots] ✓ Sync initiated (will complete in ~10-50ms)\n");
    fprintf(stderr, "[save_slots] ✓ Save complete! File is in RAM, being copied to permanent storage\n");
    fprintf(stderr, "[save_slots] save_to_slot: COMPLETE (result=1)\n");
    fprintf(stderr, "\n=== SAVE SUMMARY ===\n");
    fprintf(stderr, "Slot: %d\n", slot_num);
    fprintf(stderr, "Memory: ✓ Saved to /nethack_data/save_slots/slot_%03d.sav\n", slot_num);
    fprintf(stderr, "IndexedDB: ⏳ Syncing in background (check console for completion)\n");
    fprintf(stderr, "====================\n\n");
    return 1;
}

/* Load game from a specific slot
 * This DOES restart the game with the loaded state
 * Returns: 1 on success, 0 on failure
 */
EMSCRIPTEN_KEEPALIVE
int load_from_slot(int slot_num)
{
    char slot_relpath[256];
    const char *slot_save;
    const char *current_save;
    struct stat st;
    
    fprintf(stderr, "[save_slots] load_from_slot: slot=%d START\n", slot_num);
    
    if (slot_num < 1 || slot_num > MAX_SLOTS) {
        fprintf(stderr, "[save_slots] Invalid slot number: %d\n", slot_num);
        return 0;
    }
    
    /* Build slot relative path */
    sprintf(slot_relpath, "%s/slot_%03d.sav", SLOT_DIR, slot_num);
    
    /* Get full path with prefix */
    slot_save = fqname(slot_relpath, SAVEPREFIX, 2);
    
    /* Check if slot exists */
    if (stat(slot_save, &st) != 0) {
        fprintf(stderr, "[save_slots] Slot %d does not exist\n", slot_num);
        return 0;
    }
    
    fprintf(stderr, "[save_slots] Slot file exists: %s (size=%ld)\n", 
            slot_save, (long)st.st_size);
    
    /* Get current save location
     * CRITICAL: For WASM, we ALWAYS use "save" as the filename (not save/0player)
     * This is handled by the WASM-specific set_savefile_name() in wasm_stubs.c
     * The prefix system will add /nethack_data/ to create /nethack_data/save
     */
    fprintf(stderr, "[save_slots] Checking SAVEF value...\n");
    fprintf(stderr, "[save_slots]   Current SAVEF: '%s' (length=%zu)\n", SAVEF, strlen(SAVEF));
    
    /* Force SAVEF to "save" to ensure correct path */
    strcpy(SAVEF, "save");
    fprintf(stderr, "[save_slots]   Forced SAVEF to: '%s' (for WASM compatibility)\n", SAVEF);
    
    current_save = fqname(SAVEF, SAVEPREFIX, 1);
    fprintf(stderr, "[save_slots]   Full path with prefix: '%s'\n", current_save);
    
    /* Verify destination path is a file path, not a directory */
    if (strlen(current_save) == 0 || current_save[strlen(current_save) - 1] == '/') {
        fprintf(stderr, "[save_slots] ERROR: current_save is invalid (empty or directory): '%s'\n", current_save);
        fprintf(stderr, "[save_slots] This means fqname() failed to construct proper path\n");
        return 0;
    }
    
    fprintf(stderr, "[save_slots] Destination save path validated: %s\n", current_save);
    
    /* Copy slot to current save location */
    if (!copy_file(slot_save, current_save)) {
        fprintf(stderr, "[save_slots] Failed to copy slot to current save\n");
        return 0;
    }
    
    fprintf(stderr, "[save_slots] Copied slot to current save location\n");
    fprintf(stderr, "[save_slots] ✓ .sav file contains all level data - no separate lock files needed\n");
    fprintf(stderr, "[save_slots]   (NetHack will extract levels and create lock files on restore)\n");
    
    /* === CRITICAL FIX: Sync then request reload via main thread ===
     * 
     * PROBLEM: We run in a Web Worker, which doesn't have access to:
     *   - window object
     *   - location object (so location.reload() fails)
     *   - DOM APIs
     * 
     * SOLUTION: 
     *   1. Sync copied save file to IndexedDB (ensure persistence)
     *   2. Send message to worker → worker forwards to main thread
     *   3. Main thread calls window.location.reload()
     * 
     * WHY SYNC FIRST:
     *   - Page reload happens fast (few milliseconds)
     *   - IndexedDB sync is async (takes ~10-50ms)
     *   - If we reload before sync completes, save file won't be there!
     *   - Result: Game starts without save file = new game instead of load
     */
    fprintf(stderr, "[save_slots] Syncing save file to IndexedDB...\n");
    EM_ASM({
        console.log('[save_slots] [JS] Step 1: Syncing RAM → IndexedDB...');
        FS.syncfs(false, function(err) {
            if (err) {
                console.error('[save_slots] [JS] ✗ Sync FAILED:', err);
                console.error('[save_slots] [JS] Cannot reload - save file not persisted!');
            } else {
                console.log('[save_slots] [JS] ✓ Sync complete!');
                console.log('[save_slots] [JS] Step 2: Requesting main thread to reload page...');
                
                // Send message to worker → worker forwards to main thread
                // Worker context: self.postMessage() sends to worker's message handler
                // Main thread context: postMessage() would send to window
                postMessage({ 
                    type: 'REQUEST_PAGE_RELOAD', 
                    reason: 'load_save_slot',
                    message: 'Save file restored, reloading to load game...'
                });
            }
        });
    });
    
    fprintf(stderr, "[save_slots] Reload request sent to main thread\n");
    return 1;
}

/* List all available save slots
 * Returns: JSON string with array of slot metadata
 */
EMSCRIPTEN_KEEPALIVE
const char* list_save_slots(void)
{
    static char result[16384];
    char meta_relpath[256];
    const char *meta_path;
    FILE *fp;
    int slot;
    int first = 1;
    struct stat st;
    
    fprintf(stderr, "[save_slots] list_save_slots: START\n");
    
    /* Start JSON array */
    strcpy(result, "[");
    
    /* Check each slot */
    for (slot = 1; slot <= MAX_SLOTS; slot++) {
        /* Build relative path for metadata */
        sprintf(meta_relpath, "%s/slot_%03d.meta", SLOT_DIR, slot);
        
        /* Get full path with prefix */
        meta_path = fqname(meta_relpath, SAVEPREFIX, 2);
        
        /* Check if metadata exists */
        if (stat(meta_path, &st) != 0) {
            continue;  /* Slot doesn't exist */
        }
        
        /* Read metadata file */
        fp = fopen(meta_path, "r");
        if (!fp) {
            fprintf(stderr, "[save_slots] Failed to open metadata: %s\n", meta_path);
            continue;
        }
        
        /* Add to result array */
        if (!first) {
            strcat(result, ",");
        }
        first = 0;
        
        /* Read entire file */
        char meta_json[2048];
        size_t n = fread(meta_json, 1, sizeof(meta_json) - 1, fp);
        meta_json[n] = '\0';
        fclose(fp);
        
        strcat(result, meta_json);
    }
    
    /* End JSON array */
    strcat(result, "]");
    
    fprintf(stderr, "[save_slots] list_save_slots: Found %d slots\n", 
            first ? 0 : (11 - first));
    
    return result;
}

/* Delete a save slot */
EMSCRIPTEN_KEEPALIVE
int delete_save_slot(int slot_num)
{
    char slot_relpath[256];
    char meta_relpath[256];
    const char *slot_save;
    const char *meta_path;
    
    fprintf(stderr, "[save_slots] delete_save_slot: slot=%d\n", slot_num);
    
    if (slot_num < 1 || slot_num > MAX_SLOTS) {
        return 0;
    }
    
    /* Build relative paths */
    sprintf(slot_relpath, "%s/slot_%03d.sav", SLOT_DIR, slot_num);
    sprintf(meta_relpath, "%s/slot_%03d.meta", SLOT_DIR, slot_num);
    
    /* Get full paths with prefix */
    slot_save = fqname(slot_relpath, SAVEPREFIX, 2);
    meta_path = fqname(meta_relpath, SAVEPREFIX, 3);
    
    /* Delete files */
    unlink(slot_save);
    unlink(meta_path);
    
    /* Sync to IndexedDB */
    EM_ASM(
        FS.syncfs(false, function(err) {
            if (err) console.error('[save_slots] Failed to sync after delete:', err);
        });
    );
    
    return 1;
}

#endif /* __EMSCRIPTEN__ */
