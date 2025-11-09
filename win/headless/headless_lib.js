/**
 * JavaScript library for headless window port WASM functions
 * This provides async input handling using a polling + sleep approach
 */

mergeInto(LibraryManager.library, {
  // Start waiting for input - called from C
  headless_start_input_wait: function() {
    console.error('[headless_lib.js] start_input_wait called');
    
    // Access global state - must be on global/window object
    if (typeof global !== 'undefined') {
      // Node.js
      if (!global.headlessInputState) {
        global.headlessInputState = { pendingKeycode: -1, waitingForInput: false };
      }
      global.headlessInputState.waitingForInput = true;
      global.headlessInputState.pendingKeycode = -1;
      
      // Request input from global wasmGetNextInputKey function
      if (typeof global.wasmGetNextInputKey !== 'undefined') {
        global.wasmGetNextInputKey().then(function(keycode) {
          console.error('[headless_lib.js] Got keycode from Promise: ' + keycode);
          global.headlessInputState.pendingKeycode = keycode;
          global.headlessInputState.waitingForInput = false;
        });
      } else {
        console.error('[headless_lib.js] ERROR: wasmGetNextInputKey is not defined!');
      }
    } else {
      console.error('[headless_lib.js] ERROR: global is undefined!');
    }
  },
  
  // Check if input is ready - called from C in a loop
  headless_check_input_ready: function() {
    if (typeof global !== 'undefined' && global.headlessInputState) {
      var ready = global.headlessInputState.pendingKeycode >= 0 ? 1 : 0;
      if (ready) {
        console.error('[headless_lib.js] Input ready! Keycode: ' + global.headlessInputState.pendingKeycode);
      }
      return ready;
    }
    return 0;
  },
  
  // Get the input keycode - called from C after ready
  headless_get_input_keycode: function() {
    if (typeof global !== 'undefined' && global.headlessInputState) {
      var keycode = global.headlessInputState.pendingKeycode;
      console.error('[headless_lib.js] get_input_keycode returning: ' + keycode);
      global.headlessInputState.pendingKeycode = -1;
      return keycode;
    }
    return -1;
  }
});
