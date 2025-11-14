/**
 * JavaScript library for headless window port WASM functions
 * This provides async input handling using a polling + sleep approach
 * 
 * Also handles filesystem initialization for save/level files
 */

var LibraryHeadless = {
  $headless__deps: [],
  $headless: {
    /**
     * Initialize filesystem for NetHack save files
     * Called before main() starts
     * Based on BrowserHack's approach
     */
    pre_run: function() {
      console.error('[headless_lib.js] pre_run: Initializing filesystem');
      
      // Set up environment
      if (typeof ENV !== 'undefined') {
        ENV['USER'] = ENV['USER'] || 'player';
        ENV['HOME'] = '/home/nethack_player';
      }
      
      // Create necessary directories
      try {
        FS.mkdir('/home');
      } catch(e) {
        console.error('[headless_lib.js] /home already exists or cannot be created');
      }
      
      try {
        FS.mkdir('/home/nethack_player');
      } catch(e) {
        console.error('[headless_lib.js] /home/nethack_player already exists or cannot be created');
      }
      
      // Create save directory - this is where level files will be stored
      try {
        FS.mkdir('/save');
      } catch(e) {
        console.error('[headless_lib.js] /save already exists or cannot be created');
      }
      
      // For Node.js environment (testing), we don't use IDBFS
      // For browser environment, we would mount IDBFS here
      if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
        console.error('[headless_lib.js] Browser environment detected, mounting IDBFS');
        try {
          FS.mount(IDBFS, {}, '/save');
          
          // Load existing saves from IndexedDB
          console.error('[headless_lib.js] Syncing filesystem from IndexedDB...');
          FS.syncfs(true, function(err) {
            if (err) {
              console.error('[headless_lib.js] Error syncing filesystem: ' + err);
            } else {
              console.error('[headless_lib.js] Filesystem synced successfully');
            }
          });
        } catch(e) {
          console.error('[headless_lib.js] Error mounting IDBFS: ' + e);
        }
      } else {
        console.error('[headless_lib.js] Node.js/testing environment - using memory-only filesystem');
        // In Node.js, /save is just a regular in-memory directory
        // Files will be created there but won't persist across runs
      }
      
      console.error('[headless_lib.js] Filesystem initialized');
    }
  }
};

mergeInto(LibraryManager.library, LibraryHeadless);

mergeInto(LibraryManager.library, {
  // Start waiting for input - called from C
  headless_start_input_wait: function() {
    console.error('[headless_lib.js] start_input_wait called');
    
    // Determine the global object (Node.js: global, Web Worker: self, Browser: window)
    var globalObj = (typeof self !== 'undefined') ? self 
                  : (typeof global !== 'undefined') ? global
                  : (typeof window !== 'undefined') ? window
                  : null;
    
    if (!globalObj) {
      console.error('[headless_lib.js] ERROR: Cannot find global object!');
      return;
    }
    
    // Initialize state if needed
    if (!globalObj.headlessInputState) {
      globalObj.headlessInputState = { pendingKeycode: -1, waitingForInput: false };
    }
    globalObj.headlessInputState.waitingForInput = true;
    globalObj.headlessInputState.pendingKeycode = -1;
    
    // Request input from wasmGetNextInputKey function
    if (typeof globalObj.wasmGetNextInputKey !== 'function') {
      console.error('[headless_lib.js] ERROR: wasmGetNextInputKey is not defined on global object');
      return;
    }
    
    var result = globalObj.wasmGetNextInputKey();
    
    if (typeof result === 'number') {
      console.error('[headless_lib.js] Got buffered keycode immediately: ' + result);
      globalObj.headlessInputState.pendingKeycode = result;
      globalObj.headlessInputState.waitingForInput = false;
    } 
    else if (result && typeof result.then === 'function') {
      result.then(function(keycode) {
        console.error('[headless_lib.js] Got keycode from Promise: ' + keycode);
        globalObj.headlessInputState.pendingKeycode = keycode;
        globalObj.headlessInputState.waitingForInput = false;
      }).catch(function(err) {
        console.error('[headless_lib.js] FATAL: Input promise failed:', err);
        throw new Error('[headless_lib.js] Input system error: ' + err);
      });
    }
    else {
      throw new Error('[headless_lib.js] FATAL: wasmGetNextInputKey returned invalid type: ' + typeof result);
    }
  },
  
  // Check if input is ready - called from C in a loop
  headless_check_input_ready: function() {
    var globalObj = (typeof self !== 'undefined') ? self 
                  : (typeof global !== 'undefined') ? global
                  : (typeof window !== 'undefined') ? window
                  : null;
    
    if (globalObj && globalObj.headlessInputState) {
      var ready = globalObj.headlessInputState.pendingKeycode >= 0 ? 1 : 0;
      if (ready) {
        console.error('[headless_lib.js] Input ready! Keycode: ' + globalObj.headlessInputState.pendingKeycode);
      }
      return ready;
    }
    return 0;
  },
  
  // Get the input keycode - called from C after ready
  headless_get_input_keycode: function() {
    var globalObj = (typeof self !== 'undefined') ? self 
                  : (typeof global !== 'undefined') ? global
                  : (typeof window !== 'undefined') ? window
                  : null;
    
    if (globalObj && globalObj.headlessInputState) {
      var keycode = globalObj.headlessInputState.pendingKeycode;
      console.error('[headless_lib.js] get_input_keycode returning: ' + keycode);
      globalObj.headlessInputState.pendingKeycode = -1;
      return keycode;
    }
    return -1;
  },
  
  // Called from C when NetHack needs keyboard input (nhgetch)
  // Uses Asyncify to block C execution until JavaScript Promise resolves with keycode
  headless_wait_for_input_blocking__deps: ['$Asyncify'],
  headless_wait_for_input_blocking: function() {
    console.error('[headless_lib.js] C code requesting input');
    
    var globalObj = (typeof self !== 'undefined') ? self 
                  : (typeof global !== 'undefined') ? global
                  : (typeof window !== 'undefined') ? window
                  : null;
    
    if (!globalObj) {
      throw new Error('[headless_lib.js] FATAL: Cannot find global object');
    }
    
    if (typeof globalObj.wasmGetNextInputKey !== 'function') {
      throw new Error('[headless_lib.js] FATAL: wasmGetNextInputKey not defined - input system not initialized');
    }
    
    var result = globalObj.wasmGetNextInputKey();
    
    // wasmGetNextInputKey returns either:
    // - number: Pre-buffered keycode (rare, for testing environments)
    // - Promise: Will resolve when user presses key
    if (typeof result === 'number') {
      console.error('[headless_lib.js] Pre-buffered keycode available:', result);
      return result;
    }
    
    if (result && typeof result.then === 'function') {
      console.error('[headless_lib.js] Waiting for Promise to resolve...');
      
      // Asyncify.handleSleep blocks C execution and resumes when wakeUp() is called
      var asyncifyResult = Asyncify.handleSleep(function(wakeUp) {
        result.then(function(keycode) {
          console.error('[headless_lib.js] Promise resolved, waking C code with keycode:', keycode);
          wakeUp(keycode);
        }).catch(function(err) {
          console.error('[headless_lib.js] FATAL: Promise rejected:', err);
          throw new Error('[headless_lib.js] Input promise failed: ' + err);
        });
      });
      console.error('[headless_lib.js] C code resumed with keycode:', asyncifyResult);
      return asyncifyResult;
    }
    
    throw new Error('[headless_lib.js] FATAL: wasmGetNextInputKey returned invalid type: ' + typeof result);
  },
  
  // Called from C when reading JSON lines from stdin (for RESP messages)
  // Uses Asyncify to block until stdin has a complete line available
  // Returns pointer to line in WASM memory (caller must free), or 0 on EOF
  headless_read_line_blocking__deps: ['$Asyncify', '$stringToNewUTF8'],
  headless_read_line_blocking: function() {
    console.error('[headless_lib.js] C code requesting line from stdin (for RESP)');
    
    var globalObj = (typeof self !== 'undefined') ? self 
                  : (typeof global !== 'undefined') ? global
                  : (typeof window !== 'undefined') ? window
                  : this;
    
    // Check if wasmWaitForStdinLine exists (provided by worker)
    if (typeof globalObj.wasmWaitForStdinLine !== 'function') {
      console.error('[headless_lib.js] wasmWaitForStdinLine not defined - using fallback fgets');
      return 0; // Return NULL pointer, C will use regular fgets
    }
    
    var result = globalObj.wasmWaitForStdinLine();
    
    // wasmWaitForStdinLine returns Promise that resolves with a line string
    if (result && typeof result.then === 'function') {
      console.error('[headless_lib.js] Waiting for stdin line Promise...');
      
      var asyncifyResult = Asyncify.handleSleep(function(wakeUp) {
        result.then(function(lineStr) {
          console.error('[headless_lib.js] Got stdin line, length:', lineStr.length);
          console.error('[headless_lib.js]   Line preview:', lineStr.substring(0, 80));
          
          // Convert JS string to C string in WASM memory
          var strPtr = stringToNewUTF8(lineStr);
          console.error('[headless_lib.js] Allocated C string at ptr:', strPtr);
          wakeUp(strPtr);
        }).catch(function(err) {
          console.error('[headless_lib.js] stdin line Promise rejected:', err);
          wakeUp(0); // Return NULL on error
        });
      });
      
      console.error('[headless_lib.js] C code resumed with string ptr:', asyncifyResult);
      return asyncifyResult;
    }
    
    console.error('[headless_lib.js] wasmWaitForStdinLine returned invalid type:', typeof result);
    return 0; // NULL
  }
});
