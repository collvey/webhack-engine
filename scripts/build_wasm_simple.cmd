@echo off
rem Complete WASM build with all NetHack core sources
rem This builds the full NetHack engine for WebAssembly

echo ========================================
echo Building NetHack WASM (Complete - M6)
echo ========================================
echo.

call "%USERPROFILE%\emsdk\emsdk_env.bat"

echo Building complete WASM module with all sources...
echo This will take 2-3 minutes...
echo.

pushd "%~dp0.."

rem Prepare WASM-specific sysconf
echo Preparing WASM-specific sysconf...
copy /Y binary\sysconf.wasm binary\sysconf >nul
echo.

rem Build with ALL necessary source files
rem IMPORTANT: Do NOT define -DWIN32CON or -DMICRO - these enable Windows file locking!
rem WASM should behave like UNIX, not Windows
rem Add -DNOMAIL to match onames.h state (SCR_MAIL not generated)
rem CRITICAL: -s ASYNCIFY=1 enables blocking I/O (fgets) to work in WASM
rem Force-undefine WIN32 macros that emcc auto-defines when building on Windows
emcc -O2 ^
     -UWIN32 ^
     -U_WIN32 ^
     -U__WIN32__ ^
     -DTILES ^
     -DHEADLESS ^
     -DDLB ^
     -DSAFEPROCS ^
     -DNOTPARMDECL ^
     -DNOMAIL ^
     -DUNIX ^
     -DWASM ^
     -D__EMSCRIPTEN__ ^
     -I include ^
     -I win/headless ^
     -s WASM=1 ^
     -s ALLOW_MEMORY_GROWTH=1 ^
     -s FORCE_FILESYSTEM=1 ^
     -s MODULARIZE=1 ^
     -s EXPORT_NAME=NetHackModule ^
     -s ENVIRONMENT=web ^
     -s EXPORTED_RUNTIME_METHODS=FS,ccall,cwrap,UTF8ToString,allocateUTF8 ^
     -s EXPORTED_FUNCTIONS=_main,_save_to_slot,_load_from_slot,_list_save_slots,_delete_save_slot,_init_save_slots,_wasm_early_init,_set_option_direct ^
     -s INITIAL_MEMORY=67108864 ^
     -s ASYNCIFY=1 ^
     -s ASYNCIFY_STACK_SIZE=262144 ^
     -s ASYNCIFY_IMPORTS=[headless_wait_for_input_blocking,headless_read_line_blocking,save_to_slot] ^
     -s ALLOW_MEMORY_GROWTH=1 ^
     -s STACK_SIZE=5MB ^
     -lidbfs.js ^
     --js-library win/headless/headless_lib.js ^
     --preload-file sys/wasm/.nethackrc@/home/web_user/.nethackrc ^
     --preload-file sys/wasm/sysconf@/sysconf ^
     --preload-file sys/wasm/nhdat@/nhdat ^
     --preload-file sys/wasm/dungeon@/dungeon ^
     --exclude-file *.exe ^
     --exclude-file *.dll ^
     --exclude-file *.PDB ^
     --exclude-file *.exp ^
     --exclude-file *.lib ^
     -o webhack-client/public/nethack.js ^
     win/headless/main_wasm.c ^
     win/headless/winheadless.c ^
     src/allmain.c ^
     src/alloc.c ^
     src/apply.c ^
     src/artifact.c ^
     src/attrib.c ^
     src/ball.c ^
     src/bones.c ^
     src/botl.c ^
     src/cmd.c ^
     src/dbridge.c ^
     src/decl.c ^
     src/detect.c ^
     src/dig.c ^
     src/display.c ^
     src/dlb.c ^
     src/do.c ^
     src/dog.c ^
     src/dogmove.c ^
     src/dokick.c ^
     src/dothrow.c ^
     src/do_name.c ^
     src/do_wear.c ^
     src/drawing.c ^
     src/dungeon.c ^
     src/eat.c ^
     src/end.c ^
     src/engrave.c ^
     src/exper.c ^
     src/explode.c ^
     src/extralev.c ^
     src/files.c ^
     src/fountain.c ^
     src/hack.c ^
     src/hacklib.c ^
     src/invent.c ^
     src/light.c ^
     src/lock.c ^
     src/mail.c ^
     src/makemon.c ^
     src/mapglyph.c ^
     src/mcastu.c ^
     src/mhitm.c ^
     src/mhitu.c ^
     src/minion.c ^
     src/mklev.c ^
     src/mkmap.c ^
     src/mkmaze.c ^
     src/mkobj.c ^
     src/mkroom.c ^
     src/mon.c ^
     src/mondata.c ^
     src/monmove.c ^
     src/monst.c ^
     src/mplayer.c ^
     src/mthrowu.c ^
     src/muse.c ^
     src/music.c ^
     src/o_init.c ^
     src/objects.c ^
     src/objnam.c ^
     src/options.c ^
     src/pager.c ^
     src/pickup.c ^
     src/pline.c ^
     src/polyself.c ^
     src/potion.c ^
     src/pray.c ^
     src/priest.c ^
     src/quest.c ^
     src/questpgr.c ^
     src/read.c ^
     src/rect.c ^
     src/region.c ^
     src/restore.c ^
     src/rip.c ^
     src/rnd.c ^
     src/role.c ^
     src/rumors.c ^
     src/save.c ^
     src/shk.c ^
     src/shknam.c ^
     src/sit.c ^
     src/sounds.c ^
     src/sp_lev.c ^
     src/spell.c ^
     src/steal.c ^
     src/steed.c ^
     src/sys.c ^
     src/teleport.c ^
     src/timeout.c ^
     src/topten.c ^
     src/track.c ^
     src/trap.c ^
     src/u_init.c ^
     src/uhitm.c ^
     src/vault.c ^
     src/version.c ^
     src/vision.c ^
     src/weapon.c ^
     src/were.c ^
     src/wield.c ^
     src/windows.c ^
     src/wizard.c ^
     src/worm.c ^
     src/worn.c ^
     src/write.c ^
     src/zap.c ^
     src/isaac64.c ^
     sys/share/cppregex.cpp ^
     sys/share/ioctl.c ^
     sys/share/unixtty.c ^
     sys/unix/unixunix.c ^
     sys/wasm/wasm_stubs.c ^
     sys/wasm/wasm_tty_stubs.c ^
     win/headless/save_slots.c

if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Build failed!
    popd
    exit /b 1
)

popd

echo.
echo ========================================
echo Build complete!
echo ========================================
echo Output:
dir webhack-client\public\nethack.* 2>nul
echo.
echo Size:
for %%f in (webhack-client\public\nethack.wasm) do echo   WASM: %%~zf bytes
for %%f in (webhack-client\public\nethack.js) do echo   JS: %%~zf bytes
echo.
echo Next: Test in browser with React app
echo   cd webhack-client
echo   npm run dev
echo.
