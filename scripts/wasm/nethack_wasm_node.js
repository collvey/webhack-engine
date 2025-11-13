/**
 * NetHack WASM Node.js Adapter
 * 
 * Runs the NetHack WASM module in Node.js with stdin/stdout interface,
 * exactly like the native nethack_headless.exe binary.
 * 
 * This allows the same WASM build used in the browser to be used for:
 * - Automated testing (Python subprocess communication)
 * - Command-line gameplay
 * - CI/CD integration
 * 
 * Architecture: stdin/stdout (JSON) <-> WASM module
 * (Companion to: nethack.worker.js for browser Web Worker)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the Emscripten-generated module from the public directory
const WASM_DIR = join(__dirname, '..', '..', 'webhack-client', 'public');
const NETHACK_JS = join(WASM_DIR, 'nethack.js');

console.error('[WASM Runner] Loading from:', NETHACK_JS);

// Read and eval the CommonJS module
const moduleCode = readFileSync(NETHACK_JS, 'utf8');
const moduleExports = {};
const module = { exports: moduleExports };
const exports = moduleExports;

// Provide Node.js-like globals for Emscripten
const globalThis = global;

// Stub out browser APIs that aren't available in Node.js
// This prevents the IndexedDB sync from hanging the game
if (typeof indexedDB === 'undefined') {
  global.indexedDB = undefined;
}

// Execute the module code in a context with module/exports
eval(moduleCode);

// Get the exported factory function
const NetHackModule = module.exports;

// Change working directory to WASM_DIR so module can find .wasm and .data files
process.chdir(WASM_DIR);
console.error('[WASM Runner] Working directory:', process.cwd());

// Set up JSON input protocol with Promise-based async handling
let stdinBuffer = '';
let pendingInputResolvers = [];
let bufferedKeycodes = [];  // Buffer for input that arrives before resolvers are ready

// Process stdin data and parse JSON INPUT commands
function processStdinData(data) {
  stdinBuffer += data;
  
  // Process complete JSON lines
  const lines = stdinBuffer.split('\n');
  stdinBuffer = lines.pop(); // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const json = JSON.parse(line);
      console.error('[WASM Runner] Received JSON:', json);
      
      if (json.type === 'INPUT') {
        // Extract keycode
        let keycode = -1;
        if (json.keycode !== undefined && json.keycode >= 0 && json.keycode <= 255) {
          keycode = json.keycode;
        } else if (json.key && json.key.length > 0) {
          keycode = json.key.charCodeAt(0);
        }
        
        if (keycode >= 0) {
          console.error('[WASM Runner] Got keycode:', keycode);
          
          // If there's a resolver waiting, resolve it immediately
          if (pendingInputResolvers.length > 0) {
            const resolve = pendingInputResolvers.shift();
            console.error('[WASM Runner] Resolving pending request with keycode:', keycode);
            resolve(keycode);
          } else {
            // Buffer the keycode for later - resolver will consume it when ready
            console.error('[WASM Runner] No resolver ready, buffering keycode:', keycode);
            bufferedKeycodes.push(keycode);
          }
        }
      }
    } catch (e) {
      console.error('[WASM Runner] Failed to parse JSON:', e.message);
    }
  }
}

// Listen to stdin for JSON input
process.stdin.setEncoding('utf8');

// Resume stdin to enable reading (required for Node.js)
process.stdin.resume();

process.stdin.on('data', (data) => {
  console.error('[WASM Runner] stdin data received:', data.length, 'bytes');
  processStdinData(data);
});

process.stdin.on('end', () => {
  console.error('[WASM Runner] stdin closed');
  // Resolve any pending requests with ESC (quit)
  while (pendingInputResolvers.length > 0) {
    const resolve = pendingInputResolvers.shift();
    resolve(27); // ESC
  }
});

process.stdin.on('error', (err) => {
  console.error('[WASM Runner] stdin error:', err.message);
});

console.error('[WASM Runner] stdin listener registered and ready');

// Call the factory function to create the module instance
NetHackModule({
  // Don't define stdin at all - let Emscripten use its default
  // which won't try to read from process.stdin
  // (We use wasmGetNextInputKey Promise API instead)
  
  // Provide a preRun hook to override FS.syncfs before it's called
  preRun: [
    (Module) => {
      console.error('[WASM Runner] preRun: Overriding FS.syncfs to skip IndexedDB');
      // Override FS.syncfs to immediately call callback with success
      // This prevents hanging when IndexedDB is not available in Node.js
      if (Module.FS) {
        Module.FS.syncfs = function(populate, callback) {
          console.error('[WASM Runner] FS.syncfs called - skipping (no IndexedDB)');
          if (callback) {
            // Call callback asynchronously to mimic real behavior
            setTimeout(() => callback(null), 0);
          }
        };
      }
      
      // Initialize filesystem for NetHack (BrowserHack-style)
      console.error('[WASM Runner] preRun: Initializing filesystem for save files');
      
      // Set up environment
      if (typeof Module.ENV !== 'undefined') {
        Module.ENV['USER'] = Module.ENV['USER'] || 'player';
        Module.ENV['HOME'] = '/home/nethack_player';
      }
      
      // Create necessary directories
      try {
        Module.FS.mkdir('/home');
      } catch(e) {
        console.error('[WASM Runner] /home already exists');
      }
      
      try {
        Module.FS.mkdir('/home/nethack_player');
      } catch(e) {
        console.error('[WASM Runner] /home/nethack_player already exists');
      }
      
      // Create /save directory for level files
      try {
        Module.FS.mkdir('/save');
        console.error('[WASM Runner] Created /save directory for level files');
      } catch(e) {
        console.error('[WASM Runner] /save already exists or cannot be created:', e.message);
      }
      
      console.error('[WASM Runner] Filesystem initialized successfully');
    },
    () => {
      // Make getNextInputKey globally accessible for library functions
      console.error('[WASM Runner] preRun: Setting up global.wasmGetNextInputKey');
      global.wasmGetNextInputKey = () => {
        console.error('[WASM Runner] wasmGetNextInputKey() called, buffered:', bufferedKeycodes.length);
        
        // Check buffered input first
        // CRITICAL: Return the keycode DIRECTLY, not wrapped in a Promise!
        // Asyncify.handleAsync expects the async function to await a pending Promise,
        // but if the value is already available, we should return it synchronously.
        if (bufferedKeycodes.length > 0) {
          const keycode = bufferedKeycodes.shift();
          console.error('[WASM Runner] Returning buffered keycode directly:', keycode);
          return keycode; // Return directly, not Promise.resolve(keycode)
        }
        
        // Check if there's already a pending resolver (shouldn't happen!)
        if (pendingInputResolvers.length > 0) {
          console.error('[WASM Runner] WARNING: Already have', pendingInputResolvers.length, 'pending resolvers!');
          console.error('[WASM Runner] This might indicate recursive/nested Asyncify calls!');
        }
        
        // Wait for new input with timeout fallback
        console.error('[WASM Runner] No buffered input, creating Promise for new INPUT (with timeout)...');
        return new Promise((resolve) => {
          pendingInputResolvers.push(resolve);
          console.error('[WASM Runner] Added resolver to queue, total pending:', pendingInputResolvers.length);
          
          // Set a timeout to prevent infinite hanging
          // After 5 seconds, resolve with '.' (wait command) to keep game alive
          const timeoutId = setTimeout(() => {
            // Check if this resolver is still pending
            const stillPending = pendingInputResolvers.includes(resolve);
            if (stillPending) {
              console.error('[WASM Runner] INPUT TIMEOUT after 5s - sending "." (wait) to keep game alive');
              // Remove this resolver from pending list
              const idx = pendingInputResolvers.indexOf(resolve);
              if (idx >= 0) {
                pendingInputResolvers.splice(idx, 1);
              }
              // Resolve with '.' (period = wait one turn)
              resolve('.'.charCodeAt(0));
            } else {
              console.error('[WASM Runner] Timeout fired but resolver already consumed');
            }
          }, 5000);
          
          console.error('[WASM Runner] Timeout scheduled for 5000ms');
        });
      };
    }
  ],
  
  // Help Emscripten locate files
  locateFile: (path, prefix) => {
    console.error('[WASM Runner] Locating file:', path);
    return join(WASM_DIR, path);
  },
  
  // Provide synchronous file reading for Node.js
  readBinary: (filename) => {
    console.error('[WASM Runner] Reading binary file:', filename);
    return readFileSync(filename);
  },
  
  // Provide async file reading
  readAsync: async (filename) => {
    console.error('[WASM Runner] Reading async file:', filename);
    const data = readFileSync(filename);
    return data;
  },
  
  // Override wasmBinary to load it synchronously
  wasmBinary: (() => {
    const wasmPath = join(WASM_DIR, 'nethack.wasm');
    console.error('[WASM Runner] Pre-loading WASM from:', wasmPath);
    return readFileSync(wasmPath);
  })(),
  
  // Provide the preloaded data package
  getPreloadedPackage: (remotePackageName, remotePackageSize) => {
    const dataPath = join(WASM_DIR, 'nethack.data');
    console.error('[WASM Runner] Pre-loading data from:', dataPath);
    return readFileSync(dataPath).buffer;
  },
  
  // Forward stdout to Node.js stdout
  print: (text) => {
    process.stdout.write(text + '\n');
  },
  
  printErr: (text) => {
    process.stderr.write(text + '\n');
  },
  
  // Async input function called from WASM via Asyncify.handleAsync()
  // This returns a Promise that resolves when an INPUT JSON arrives
  getNextInputKey: async () => {
    console.error('[WASM Runner] getNextInputKey() - Checking for INPUT...');
    
    // Check if we have buffered input first
    if (bufferedKeycodes.length > 0) {
      const keycode = bufferedKeycodes.shift();
      console.error('[WASM Runner] Returning buffered keycode:', keycode);
      return keycode;
    }
    
    // No buffered input, wait for new input via Promise
    console.error('[WASM Runner] No buffered input, waiting for new INPUT...');
    return new Promise((resolve) => {
      // Add to pending resolvers queue
      pendingInputResolvers.push(resolve);
      console.error('[WASM Runner] Added resolver to queue, total pending:', pendingInputResolvers.length);
    });
  },
  
  onRuntimeInitialized: () => {
    console.error('[WASM Runner] Runtime initialized');
    console.error('[WASM Runner] stdin will block on readSync(process.stdin.fd)');
    // Note: FS.syncfs was already overridden in preRun hook above
  },
  
  onExit: (code) => {
    console.error('[WASM Runner] Program exited with code:', code);
  }
}).then((Module) => {
  console.error('[WASM Runner] NetHack WASM loaded successfully');
  console.error('[WASM Runner] Module stdin function:', typeof Module.stdin);
  // main() will run automatically
}).catch((err) => {
  console.error('[WASM Runner] Failed to load WASM:', err);
  process.exit(1);
});
