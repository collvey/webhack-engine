/**
 * JavaScript library for headless window port WASM functions
 * This provides async input handling using a polling + sleep approach
 * 
 * Also handles filesystem initialization for save/level files
 */

// Use the global UniversalLogger loaded by worker/node environment
// universal-logger.js MUST be loaded before this library is included
// Worker: importScripts('/universal-logger.js')
// Node.js: require('universal-logger.js')
// During Emscripten build, UniversalLogger won't be available - use console fallback
var logger = (typeof UniversalLogger !== 'undefined') 
  ? UniversalLogger.get('headless_lib')
  : {
      essential: function(msg) { console.log('[headless_lib] ' + msg); },
      info: function(msg) { console.log('[headless_lib] ' + msg); },
      debug: function(msg) { console.log('[headless_lib] ' + msg); },
      verbose: function(msg) { console.log('[headless_lib] ' + msg); },
      error: function(msg) { console.error('[headless_lib] ' + msg); }
    };

var LibraryHeadless = {
  $headless__deps: [],
  $headless: {
    /**
     * Initialize filesystem for NetHack save files
     * Called before main() starts
     * Based on BrowserHack's approach
     */
    pre_run: function() {
      
      // Set up environment
      if (typeof ENV !== 'undefined') {
        ENV['USER'] = ENV['USER'] || 'player';
        ENV['HOME'] = '/home/nethack_player';
      }
      
      // Create necessary directories
      try {
        FS.mkdir('/home');
      } catch(e) {
        logger.debug('/home already exists or cannot be created');
      }
      
      try {
        FS.mkdir('/home/nethack_player');
      } catch(e) {
        logger.debug('/home/nethack_player already exists or cannot be created');
      }
      
      // Create save directory - this is where level files will be stored
      try {
        FS.mkdir('/save');
      } catch(e) {
        logger.debug('/save already exists or cannot be created');
      }
      
      // For Node.js environment (testing), we don't use IDBFS
      // For browser environment, we would mount IDBFS here
      if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
        try {
          FS.mount(IDBFS, {}, '/save');
          
          FS.syncfs(true, function(err) {
            if (err) {
              logger.error('Error syncing filesystem: ' + err);
            }
          });
        } catch(e) {
          logger.error('Error mounting IDBFS: ' + e);
        }
      } else {
        logger.debug('Node.js/testing environment - using memory-only filesystem');
        // In Node.js, /save is just a regular in-memory directory
        // Files will be created there but won't persist across runs
      }
    }
  }
};

mergeInto(LibraryManager.library, LibraryHeadless);

mergeInto(LibraryManager.library, {
  // Start waiting for input - called from C
  headless_start_input_wait: function() {
    
    // Determine the global object (Node.js: global, Web Worker: self, Browser: window)
    var globalObj = (typeof self !== 'undefined') ? self 
                  : (typeof global !== 'undefined') ? global
                  : (typeof window !== 'undefined') ? window
                  : null;
    
    if (!globalObj) {
      logger.error('Cannot find global object!');
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
      logger.error('wasmGetNextInputKey is not defined on global object');
      return;
    }
    
    var result = globalObj.wasmGetNextInputKey();
    
    if (typeof result === 'number') {
      globalObj.headlessInputState.pendingKeycode = result;
      globalObj.headlessInputState.waitingForInput = false;
    } 
    else if (result && typeof result.then === 'function') {
      result.then(function(keycode) {
        globalObj.headlessInputState.pendingKeycode = keycode;
        globalObj.headlessInputState.waitingForInput = false;
      }).catch(function(err) {
        logger.error('Input promise failed: ' + err);
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
      globalObj.headlessInputState.pendingKeycode = -1;
      return keycode;
    }
    return -1;
  },
  
  // Called from C when NetHack needs keyboard input (nhgetch)
  // Uses Asyncify to block C execution until JavaScript Promise resolves with keycode
  headless_wait_for_input_blocking__deps: ['$Asyncify'],
  headless_wait_for_input_blocking: function() {    
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
      return result;
    }
    
    if (result && typeof result.then === 'function') {
      
      // Asyncify.handleSleep blocks C execution and resumes when wakeUp() is called
      var asyncifyResult = Asyncify.handleSleep(function(wakeUp) {
        result.then(function(keycode) {
          wakeUp(keycode);
        }).catch(function(err) {
          logger.error('Promise rejected: ' + err);
          throw new Error('[headless_lib.js] Input promise failed: ' + err);
        });
      });
      return asyncifyResult;
    }
    
    throw new Error('[headless_lib.js] FATAL: wasmGetNextInputKey returned invalid type: ' + typeof result);
  },
  
  // Called from C when reading JSON lines from stdin (for RESP messages)
  // Uses Asyncify to block until stdin has a complete line available
  // Returns pointer to line in WASM memory (caller must free), or 0 on EOF
  headless_read_line_blocking__deps: ['$Asyncify', '$stringToNewUTF8'],
  headless_read_line_blocking: function() {
    
    var globalObj = (typeof self !== 'undefined') ? self 
                  : (typeof global !== 'undefined') ? global
                  : (typeof window !== 'undefined') ? window
                  : this;
    
    // Check if wasmWaitForStdinLine exists (provided by worker)
    if (typeof globalObj.wasmWaitForStdinLine !== 'function') {
      return 0; // Return NULL pointer, C will use regular fgets
    }
    
    var result = globalObj.wasmWaitForStdinLine();
    
    // wasmWaitForStdinLine returns Promise that resolves with a line string
    if (result && typeof result.then === 'function') {
      
      var asyncifyResult = Asyncify.handleSleep(function(wakeUp) {
        result.then(function(lineStr) {
          
          // Convert JS string to C string in WASM memory
          var strPtr = stringToNewUTF8(lineStr);
          wakeUp(strPtr);
        }).catch(function(err) {
          logger.error('stdin line Promise rejected: ' + err);
          wakeUp(0); // Return NULL on error
        });
      });
      
      return asyncifyResult;
    }
    
    return 0; // NULL
  }
});
