# Adding another construction (panels, tiling, flooring, …)

The reusable layer lives in `src/lesson/`. It is **construction-agnostic**: pacing, subtitles, narration text,
caption bar, deterministic MP4 export and printable step images only need two things from a new construction.

| You supply | Contract | Wallpaper example |
| --- | --- | --- |
| Ordered steps + disclaimer | `LessonDefinition` in `src/lesson/types.ts` | `src/wallpaper/lesson.ts` |
| A 3D scene that can draw any step at any progress | `LessonRenderer` in `src/lesson/types.ts` | `src/wallpaper/WallpaperScene.ts` |

## Steps

1. **Write the guide data** (instruction, reason, tools, warning, evidence, `seconds`, `operation`).
   Each step needs `id`, `title`, `shortTitle`, `instruction`, `seconds`, `operation`, optional `warning`.
   Keep `evidence` honest: label manufacturer guidance, adhesive/product guidance and *reconstructed demonstration* separately,
   as `src/wallpaper/guide.ts` does. Never attribute instructions to a document you have not read.
2. **Wrap it as a `LessonDefinition`** (copy `src/wallpaper/lesson.ts`) with a `disclaimer`. The disclaimer is burned into every video frame.
3. **Build the scene** and implement `LessonRenderer`:
   - `beginExport(style)` / `endExport()` – freeze the interactive loop, remember camera/view, restore afterwards.
   - `renderLessonFrame(canvas, request)` – seek to `request.stepIndex` + `request.progress`, render at `request.width × request.height`
     (always 16:9), draw the result on `canvas`, then call `drawCaptionBar` if `request.caption` is present.
     Copy the pattern in `WallpaperScene.renderLessonFrame`, including the view-offset trick that keeps the action above the caption bar.
4. **Reuse, don't rewrite**:
   - `exportLessonVideo()` → silent H.264 MP4 plus a `.vtt` subtitle sidecar.
   - `LessonVideoDialog` → the export UI (takes any `LessonDefinition` + `LessonRenderer`).
   - `pacedStepSeconds()` → step length long enough to read/narrate the text.
   - `spokenText()` → the one string used for narration, subtitles and reading-time.
5. **Add tests** like `tests/lesson-outputs.test.ts` for your lesson (pacing, subtitles, caption fit).
6. **Verify in a real browser**: export one step, then `ffprobe` the MP4 (codec `h264`, 1920×1080, 30 fps, expected frame count) and look at extracted frames.

## What is *not* generic yet

- `src/wallpaper/WallpaperTrainingPage.tsx` (the player UI), `LearningCheck`, `ReferenceDrawing` and `QualityComparison` are wallpaper-specific.
  A second construction needs its own page, or this page needs to be generalised first.
- There is no route registry. Routes are added by hand in `src/App.tsx`.
- `contracts/blueprintData.ts`, `contracts/tasks/wallpaperTask.ts` and `src/wallpaper/guide.ts` remain three separate data sources.
- Video has no audio track. Browser speech synthesis cannot be written to a file; a recorded or generated narration track would have to be added and mixed (e.g. with mediabunny audio sources).
