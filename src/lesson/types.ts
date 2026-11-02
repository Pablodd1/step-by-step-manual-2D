/**
 * Lesson-agnostic contracts shared by every construction lesson (wallpaper today,
 * panels, tiling, flooring... later). A new construction supplies:
 *   1. a `LessonDefinition` (ordered steps + disclaimer), and
 *   2. a scene that implements `LessonRenderer`.
 * Pacing, captions, narration, MP4 export and printable step images are then reusable as-is.
 * See docs/ADDING_A_CONSTRUCTION.md.
 */

export interface LessonStepLike {
  id: string;
  title: string;
  shortTitle: string;
  instruction: string;
  warning?: string;
  /** Pure animation length in seconds (choreography), NOT reading time. */
  seconds: number;
  /** Scene-specific operation key understood by the lesson's renderer. */
  operation: string;
}

export interface LessonDefinition<S extends LessonStepLike = LessonStepLike> {
  id: string;
  title: string;
  /** Burned into every exported frame. */
  disclaimer: string;
  /** Short lines shown on the video intro card (e.g. what you need). Optional. */
  introLines?: string[];
  steps: S[];
}

export interface FrameCaption {
  stepLabel: string;
  title: string;
  body: string;
  warning?: string;
  footer: string;
  /** 0-based step index and total, used to draw the lesson progress strip. */
  stepIndex: number;
  stepCount: number;
}

export interface LessonFrameRequest {
  stepIndex: number;
  /** 0..1 within the step's choreography. */
  progress: number;
  operation: string;
  width: number;
  height: number;
  caption?: FrameCaption;
  /** Draw the detail loupe and motion/dimension overlays (default true). */
  overlays?: boolean;
}

export type LessonStyle = "room" | "drawing";

/** Implemented by each construction's 3D scene. Frames are always 16:9. */
export interface LessonRenderer {
  beginExport(style: LessonStyle): void;
  renderLessonFrame(target: HTMLCanvasElement, request: LessonFrameRequest): Promise<void>;
  endExport(): void;
}
