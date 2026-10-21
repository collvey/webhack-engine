#!/usr/bin/env bash
# Build the WebHack engine (NetHack 3.6.7 + headless window port) to WebAssembly.
#
# Output (in $OUT_DIR, default ./dist):
#   nethack.js     Emscripten loader (MODULARIZE, export name NetHackModule)
#   nethack.wasm   the engine
#   nethack.data   preloaded files: .nethackrc, sysconf, nhdat, nhdat.zh-CN, dungeon
#
# These three files are what the WebHack and WebHack-Steam clients consume; they
# are published as GitHub Release assets by .github/workflows/build.yml.
#
# Requirements: Emscripten (emcc on PATH, or EMCC=/path/to/emcc). The version
# used for releases is pinned in .github/workflows/build.yml; building with the
# same version reproduces the released files byte for byte.
#
# This is a faithful port of scripts/build_wasm_simple.cmd (the original Windows
# build script, kept for reference). Flags are identical.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

OUT_DIR="${OUT_DIR:-dist}"
EMCC="${EMCC:-emcc}"
mkdir -p "$OUT_DIR"

echo "== WebHack engine: building WebAssembly with $("$EMCC" --version | head -n1)"

# IMPORTANT: do not define WIN32CON or MICRO (they enable Windows file locking);
# WASM behaves like UNIX. -DNOMAIL matches the generated onames.h (no SCR_MAIL).
# -s ASYNCIFY=1 lets blocking input (fgets) work in WASM.
# -Wno-format-security / -Wno-deprecated-non-prototype silence two benign,
# very high-volume warning classes (gettext-wrapped format strings; K&R decls).
"$EMCC" -O2 \
  -Wno-format-security \
  -Wno-deprecated-non-prototype \
  -Wno-macro-redefined \
  -UWIN32 -U_WIN32 -U__WIN32__ \
  -DTILES -DHEADLESS -DDLB -DSAFEPROCS -DNOTPARMDECL -DNOMAIL -DUNIX -DWASM -D__EMSCRIPTEN__ \
  -I include \
  -I win/headless \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s FORCE_FILESYSTEM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME=NetHackModule \
  -s ENVIRONMENT=web \
  -s EXPORTED_RUNTIME_METHODS=FS,ccall,cwrap,UTF8ToString,allocateUTF8 \
  -s EXPORTED_FUNCTIONS=_main,_save_to_slot,_load_from_slot,_list_save_slots,_delete_save_slot,_init_save_slots,_wasm_early_init,_set_option_direct,_nhi18n_set_language \
  -s INITIAL_MEMORY=67108864 \
  -s ASYNCIFY=1 \
  -s ASYNCIFY_STACK_SIZE=262144 \
  -s 'ASYNCIFY_IMPORTS=[headless_wait_for_input_blocking,headless_read_line_blocking,save_to_slot]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s STACK_SIZE=5MB \
  -lidbfs.js \
  --js-library win/headless/headless_lib.js \
  --preload-file sys/wasm/.nethackrc@/home/web_user/.nethackrc \
  --preload-file sys/wasm/sysconf@/sysconf \
  --preload-file sys/wasm/nhdat@/nhdat \
  --preload-file sys/wasm/nhdat.zh-CN@/nhdat.zh-CN \
  --preload-file sys/wasm/dungeon@/dungeon \
  --exclude-file '*.exe' \
  --exclude-file '*.dll' \
  --exclude-file '*.PDB' \
  --exclude-file '*.exp' \
  --exclude-file '*.lib' \
  -o "$OUT_DIR/nethack.js" \
  win/headless/main_wasm.c \
  win/headless/winheadless.c \
  src/allmain.c src/alloc.c src/apply.c src/artifact.c src/attrib.c src/ball.c \
  src/bones.c src/botl.c src/cmd.c src/dbridge.c src/decl.c src/detect.c \
  src/dig.c src/display.c src/dlb.c src/do.c src/dog.c src/dogmove.c \
  src/dokick.c src/dothrow.c src/do_name.c src/do_wear.c src/drawing.c \
  src/dungeon.c src/eat.c src/end.c src/engrave.c src/exper.c src/explode.c \
  src/extralev.c src/files.c src/fountain.c src/hack.c src/hacklib.c \
  src/invent.c src/light.c src/lock.c src/mail.c src/makemon.c src/mapglyph.c \
  src/mcastu.c src/mhitm.c src/mhitu.c src/minion.c src/mklev.c src/mkmap.c \
  src/mkmaze.c src/mkobj.c src/mkroom.c src/mon.c src/mondata.c src/monmove.c \
  src/monst.c src/mplayer.c src/mthrowu.c src/muse.c src/music.c src/nhi18n.c \
  src/o_init.c src/objects.c src/objnam.c src/options.c src/pager.c \
  src/pickup.c src/pline.c src/polyself.c src/potion.c src/pray.c src/priest.c \
  src/quest.c src/questpgr.c src/read.c src/rect.c src/region.c src/restore.c \
  src/rip.c src/rnd.c src/role.c src/rumors.c src/save.c src/shk.c src/shknam.c \
  src/sit.c src/sounds.c src/sp_lev.c src/spell.c src/steal.c src/steed.c \
  src/sys.c src/teleport.c src/timeout.c src/topten.c src/track.c src/trap.c \
  src/u_init.c src/uhitm.c src/vault.c src/version.c src/vision.c src/weapon.c \
  src/were.c src/wield.c src/windows.c src/wizard.c src/worm.c src/worn.c \
  src/write.c src/zap.c src/isaac64.c \
  sys/share/cppregex.cpp \
  sys/share/ioctl.c \
  sys/share/unixtty.c \
  sys/unix/unixunix.c \
  sys/wasm/wasm_stubs.c \
  sys/wasm/wasm_tty_stubs.c \
  win/headless/save_slots.c

echo "== built:"
ls -l "$OUT_DIR"/nethack.js "$OUT_DIR"/nethack.wasm "$OUT_DIR"/nethack.data
(cd "$OUT_DIR" && sha256sum nethack.js nethack.wasm nethack.data | tee SHA256SUMS)
