# Mobile UI Optimization Tracker

A screenshot-driven audit of the game's mobile UI/UX, in the same spirit as the
[i18n Progress Tracker](i18n-progress-tracker.md): a self-contained web page that
shows real captures of every game stage across a matrix of mobile devices,
orientations, and locales, annotated with prioritized issues and optimization
directions.

## View the tracker

```bash
cd webhack-client && npm run dev
```

Then open **`/mobile-ui-audit.html`** on the URL it prints (e.g.
`http://localhost:PORT/mobile-ui-audit.html`).

It is an **interactive review tool**, not a static report. Two views (toggle in
the header):

### Issues view (default)

- **Left sidebar** — every finding as a row (severity dot + title + screenshot &
  comment counts), sorted by severity, with per-severity filters and a
  **＋ New issue** button.
- **Right detail pane** for the selected issue — everything is **editable and
  auto-saved**:
  - **Title, severity, category, description, proposed fix, source files** — edit
    in place; changes persist to `findings.json` (see below).
  - **Screenshots & devices** — a gallery of every screen this issue affects,
    each labelled with device / condition / stage. **＋ Add screenshot** links
    another capture (condition→device→stage picker); the × unlinks one.
  - **Good vs. affected comparison** — the affected screen shown side-by-side
    with a "good" reference (the same stage on a device/orientation the issue
    does *not* flag), with a **compare-with** dropdown to change the reference.
  - **Comments thread** — append feedback (uses the reviewer name in the header);
    comments persist and show author + timestamp.

### Matrix view

The original device × game-stage grid, one tab per condition. Cells with flagged
issues get a colored ring + count badge; click any thumbnail for a lightbox that
lists that screen's issues and links back to them.

## Editing & persistence

Edits and comments **auto-save to `public/mobile-audit/findings.json`** via a
dev-only Vite endpoint (`/api/mobile-audit/findings`, added in `vite.config.ts`,
mirroring the i18n API). Because it writes the repo file, changes are shareable
and committable. If the endpoint is unavailable (e.g. a static production build),
it falls back to `localStorage` and the header shows "saved locally ⚠". The
header save indicator shows `saving… / saved ✓ / saved locally ⚠`.

## Regenerate the screenshots

The captures are produced by driving the **live WASM game** with Playwright — no
mocks. Start the dev server, then:

```bash
cd webhack-client
npx playwright test mobile-audit-capture --reporter=list 2>&1
```

This walks 7 devices × 3 conditions × 7 stages (mobile-notice, landing,
save/load, character creation, in-game map, inventory, options menu), writes
viewport PNGs to `public/mobile-audit/<condition>/<device>/<stage>.png`, and an
index to `public/mobile-audit/shots.json`.

- Each stage is wrapped in try/catch, so one failure never aborts the matrix;
  failures are recorded (and shown in the tracker as "capture failed").
- `shots.json` is **merged** with any prior run, so you can re-capture a single
  device to fix a flake without clobbering the whole matrix, e.g.
  `npx playwright test mobile-audit-capture -g "iphone-se"`.

## Files

| File | Role |
|------|------|
| `webhack-client/public/mobile-ui-audit.html` | The tracker page (self-contained). |
| `webhack-client/public/mobile-audit/shots.json` | Generated index of every capture. |
| `webhack-client/public/mobile-audit/findings.json` | Curated issues, comments + optimization directions. Edited live by the tool; also editable by hand. |
| `webhack-client/vite.config.ts` | Hosts the dev-only `/api/mobile-audit/findings` GET/POST endpoint the tool saves through. |
| `webhack-client/public/mobile-audit/<cond>/<device>/<stage>.png` | The screenshots. |
| `webhack-client/e2e/tests/mobile-audit-capture.test.ts` | The capture script. |

To change devices/stages/conditions, edit the `DEVICES` / `CONDITIONS` /
`STAGE_LABELS` tables at the top of the capture script and re-run. To change the
written-up audit (issues, fixes, directions), edit `findings.json` — the tracker
reads it live on refresh.
