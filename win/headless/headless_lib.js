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
    
    // If it's a number (buffered input), use it immediately
    if (typeof result === 'number') {
      console.error('[headless_lib.js] Got buffered keycode immediately: ' + result);
      globalObj.headlessInputState.pendingKeycode = result;
      globalObj.headlessInputState.waitingForInput = false;
    } 
    // If it's a Promise, wait for it
    else if (result && typeof result.then === 'function') {
      result.then(function(keycode) {
        console.error('[headless_lib.js] Got keycode from Promise: ' + keycode);
        globalObj.headlessInputState.pendingKeycode = keycode;
        globalObj.headlessInputState.waitingForInput = false;
      }).catch(function(err) {
        console.error('[headless_lib.js] Promise error: ' + err);
        globalObj.headlessInputState.pendingKeycode = 27;  // ESC on error
        globalObj.headlessInputState.waitingForInput = false;
      });
    }
    else {
      console.error('[headless_lib.js] ERROR: wasmGetNextInputKey returned unexpected type: ' + typeof result);
      globalObj.headlessInputState.pendingKeycode = 27;  // ESC on error
      globalObj.headlessInputState.waitingForInput = false;
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
  
  // Blocking input function using Asyncify - BrowserHack pattern
  // This is called from C and blocks until input is available
  headless_wait_for_input_blocking__deps: ['$Asyncify'],
  headless_wait_for_input_blocking: function() {
    console.error('[headless_lib.js] wait_for_input_blocking: Starting...');
    console.error('[headless_lib.js] Asyncify available?', typeof Asyncify !== 'undefined');
    console.error('[headless_lib.js] Asyncify.State:', typeof Asyncify !== 'undefined' ? Asyncify.State : 'N/A');
    
    var globalObj = (typeof self !== 'undefined') ? self 
                  : (typeof global !== 'undefined') ? global
                  : (typeof window !== 'undefined') ? window
                  : null;
    
    if (!globalObj || typeof globalObj.wasmGetNextInputKey !== 'function') {
      console.error('[headless_lib.js] ERROR: wasmGetNextInputKey not found!');
      return 27; // ESC
    }
    
    // Call wasmGetNextInputKey - returns number or Promise
    var result = globalObj.wasmGetNextInputKey();
    
    // If buffered (number), return immediately
    if (typeof result === 'number') {
      console.error('[headless_lib.js] Got buffered keycode:', result);
      return result;
    }
    
    // If Promise, use Asyncify.handleSleep to block (BrowserHack pattern)
    if (result && typeof result.then === 'function') {
      console.error('[headless_lib.js] Got Promise, using Asyncify.handleSleep...');
      if (typeof Asyncify === 'undefined' || typeof Asyncify.handleSleep !== 'function') {
        console.error('[headless_lib.js] ERROR: Asyncify.handleSleep not available!');
        return 27; // ESC
      }
      
      var asyncifyResult = Asyncify.handleSleep(function(wakeUp) {
        console.error('[headless_lib.js] Asyncify: Setting up wakeUp callback...');
        result.then(function(keycode) {
          console.error('[headless_lib.js] Asyncify: Promise resolved! Waking with keycode:', keycode);
          wakeUp(keycode);
        }).catch(function(err) {
          console.error('[headless_lib.js] Asyncify: Promise error:', err);
          wakeUp(27); // ESC on error
        });
      });
      console.error('[headless_lib.js] Asyncify.handleSleep returned:', asyncifyResult);
      return asyncifyResult;
    }
    
    console.error('[headless_lib.js] ERROR: Unexpected result type');
    return 27; // ESC
  }
});
