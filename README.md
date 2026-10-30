# PLUMB — Interactive 2D/3D Installation Training

A React, TypeScript and Three.js repository for evidence-linked wallcovering demonstrations and UNITEC visual-training prototypes.

## Current release: 14-step paste-the-wall lesson

Open `/guides/paste-the-wall` (also available at `/training/wallpaper`). The existing home-page **2D/3D Field Guide** action reaches this lesson.

The new module in `src/wallpaper/` provides:

- A complete sequence from product verification and electrical safety through preparation, layout, plumb, measurement, paste application, dry-drop hanging, smoothing, trimming, pattern matching, outlet work, cleaning and final inspection.
- One instructional contract driving the Three.js scene, operation-specific SVG drawings, playback, global timeline and A4 field sheet.
- Play/pause, reverse playback/pause, previous/next, speed control, timeline scrubbing, camera orbit/zoom/reset and room/front views.
- A real training gate: later wet-work and installation steps cannot be entered by playback, step navigation or scrubbing until electrical safety is acknowledged. The acknowledgement does not isolate power.
- Step-specific tools, materials, reasons, warnings, inspection checks and evidence links.
- Explicit labels separating manufacturer general guidance, adhesive-manufacturer guidance and reconstructed demonstration geometry.

**Approval boundary:** this is general teaching guidance with reconstructed graphics, not manufacturer-approved training for a specified roll or adhesive. Confirm the actual roll label, adhesive datasheet, site risk assessment and electrical requirements before work. The supplied Kami viewer requires sign-in and its document has not been reviewed; no instruction is attributed to it.

## Repository reality and capability boundaries

This GitHub repository is currently a **frontend-only React/Vite application**.

- It does not contain the Hono, Drizzle, MySQL or real authentication backend used by the separate local full-stack prototype.
- `src/lib/trpc.ts` is a browser-local demo adapter, not tRPC or server persistence.
- Browser `localStorage` profiles, uploads and review states are demonstrations only. They do not synchronize across devices and are not a production moderation or asset-storage system.
- The new wallpaper module has scene-matched browser printing. It is **not yet connected to deterministic HD video export**.
- Earlier simulator/video code and screenshots are prototypes, not proof of a unified verified 1080p production pipeline for every guide.
- `contracts/blueprintData.ts`, `contracts/tasks/wallpaperTask.ts` and `src/wallpaper/guide.ts` are separate authorities for different prototypes. Do not treat them as one synchronized data source.
- A realistic render does not establish manufacturer installation approval.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Guide library and entry points |
| `/guides/paste-the-wall` | New evidence-linked 14-step lesson |
| `/training/wallpaper` | Alias for the new lesson |
| `/simulator` | Earlier granular task simulator prototype |
| `/guides/:slug` | Earlier shared guide player |
| `/materials` | Three-product UNITEC visual-fidelity pilot |
| `/calculator` | Wallpaper and panel estimation prototypes |
| `/studio` | Browser-local contribution/review demonstration |

For static hosting without SPA rewrites, enter through `/` and use in-app navigation.

## Architecture

```text
contracts/
  blueprintData.ts             Earlier CAD guide data
  tasks/wallpaperTask.ts       Earlier granular simulator task data
  guides/                      Earlier shared and UNITEC guide data
src/
  wallpaper/
    guide.ts                   New 14-step instruction, evidence and gate contract
    WallpaperScene.ts          Deterministic operation-specific Three.js choreography
    ReferenceDrawing.tsx       Reconstructed per-step SVG figures
    WallpaperTrainingPage.tsx  Timeline, playback, evidence and print interface
    wallpaper.css              Responsive technical workspace and A4 layout
  scene/                       Earlier CAD/PBR scene experiments
  pages/                       Earlier route-level prototypes
tests/
  wallpaper-guide-v3.test.ts   New instructional and provenance regression tests
  wallpaper-task.test.ts       Earlier simulator/toolpath tests
  guides-and-calculator.test.ts Earlier guide/calculator tests
```

### New-module contract

Every new step has a stable ID, phase, full and short title, instruction, reason, tools, materials, inspection check, operation, animation duration and evidence IDs. `canAccessStep()` is the electrical-gate authority. `seek(stepIndex, progress, operation)` reconstructs scene state deterministically rather than accumulating unrelated animations.

The complete timeline is 111 seconds. This is animation time, not estimated installation time.

### Add a product-specific lesson

1. Obtain the current SKU-specific roll label, installation manual, adhesive datasheet, dimensions, pattern repeat/match, safety and cleaning documents, plus usage rights.
2. Record each source and its scope. Do not substitute generic instructions for missing product facts.
3. Author a separate method-specific contract. Paste-the-wall, paste-the-paper, pre-pasted, peel-and-stick and rigid panels must not share incorrect choreography.
4. Reconstruct geometry only where necessary and label it as reconstructed. Catalogue imagery is not manufacturing CAD or a complete PBR scan.
5. Link original manual pages to steps only when the document is accessible and reviewed.
6. Test instructional order, safety gates, evidence references, forward/reverse playback, scrubbing, print and mobile behavior in the real browser.
7. Obtain editorial/client approval separately from manufacturer installation approval.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm test
npm run build
npm run dev
```

`npm run build` performs TypeScript checking and the Vite production build. Do not change the build script to hide upstream failures.

## Verification status

The new module was independently checked against this repository's React, Three.js, TypeScript, Vite and Vitest versions: six new tests passed and a clean TypeScript/Vite production build completed.

The full local dynamic prototype also passed its 10-test combined suite and production build. In that environment, the new route was cold-loaded at desktop and 390 px mobile widths. Blocked scrubbing, electrical-gate release, match/outlet choreography, forward play/pause, reverse playback/pause, evidence dialog and the three-page A4 field sheet were exercised. The mobile page had no horizontal overflow; browser runs reported no console errors, page errors or failed requests.

Those results are not a claim that every earlier prototype path has the same verification status. Run this repository's complete test/build/browser release check after cloning or making changes.

## Earlier CAD prototype gallery

These images document the earlier line-art prototype, not approval or verification of the new 14-step lesson.

| Parts/tools tray | Electrical safety prototype |
| :---: | :---: |
| ![Earlier parts tray](docs/screenshots/cad-v4-step0-tray.png) | ![Earlier safety gate](docs/screenshots/cad-v4-step1-safety.png) |

| Realistic material prototype | Outlet relief-cut prototype |
| :---: | :---: |
| ![Earlier realistic step](docs/screenshots/cad-v4-step8-realistic.png) | ![Earlier outlet step](docs/screenshots/cad-v4-step12-outlet.png) |

The earlier renderer explores `LineSegments2`, inverted-hull silhouettes, cel-shaded faces, SVG leader lines and detail loupes. Those techniques can be reused selectively, but they do not replace correct installation data or safety enforcement.

## Known limits and next work

- Connect an accessible product manual/PDF and original page references when supplied.
- Keep product-specific wallpaper methods and rigid-panel workflows separate.
- Replace or isolate browser-local demo authentication, moderation and uploads before presenting them as production features.
- Integrate deterministic HD export with the new scene only through the same timeline and verify codec, dimensions, frame rate, frame count and visual frames.
- Address bundle size with route-level code splitting before adding more scene engines.
- UNITEC installation content still awaits complete SKU-specific manufacturer evidence and approval.

## Sources and references

See `CREDITS.md` for instructional sources, product imagery attribution and open-source references. Key architecture references include [Flat Pack](https://sael.net/flatpack/?ref=gunpla) and [Nutlope/bygga](https://github.com/Nutlope/bygga) (MIT). No code was copied from Flat Pack or Bygga into the new module.
