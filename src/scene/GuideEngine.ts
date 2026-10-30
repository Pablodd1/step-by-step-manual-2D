import type * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Guide } from "@contracts/guide";
import type { SceneStyle } from "./WallpaperScene";

export type { SceneStyle };

export interface GuideEngine {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  setGuide(guide: Guide): void;
  seekGlobal(seconds: number): void;
  getCurrentTime(): number;
  getCurrentStepIndex(): number;
  setStyle(style: SceneStyle): void;
  getStyle?(): SceneStyle;
  setSuspended(suspended: boolean): void;
  resetCamera(): void;
  captureStep(stepIndex: number, width?: number, height?: number): string;
  renderExportFrame(targetCanvas: HTMLCanvasElement, seconds: number, width: number, height: number): void;
  dispose(): void;
}
