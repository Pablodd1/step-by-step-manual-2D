/**
 * Single source of truth for the reconstructed training wall (metres, wall-face coordinates).
 * Shared by the 3D scene (WallpaperScene) and the 2D manual figures (ReferenceDrawing) so the
 * printed-style drawing and the 3D build are the same object, not two separate illustrations.
 */
export const WALL_W = 3.18;
export const WALL_H = 2.7;
export const WALL_LEFT = -WALL_W / 2;
/** World z of the plaster face. Paste, paper and plate depths are offsets from this plane. */
export const WALL_FRONT_Z = -0.005;
export const PASTE_Z = WALL_FRONT_Z + 0.0015;
export const PAPER_Z = WALL_FRONT_Z + 0.003;

export const DROP_W = 0.53;
export const DROP_H = 2.64;
export const DROP_COUNT = 6;
/** 50 cm set-out from the left corner (the cited guide's example for a 52/53 cm roll). */
export const PLUMB_X = WALL_LEFT + 0.5;
/** Centre x of drop 1: its right edge sits on the plumb line, its left edge turns 3 cm into the corner. */
export const FIRST_X = PLUMB_X - DROP_W / 2;

export const SKIRTING_H = 0.105;
export const CORNICE_H = 0.075;
export const SKIRTING_TOP = SKIRTING_H;
export const CORNICE_BOTTOM = WALL_H - CORNICE_H;

/** Duplex outlet faceplate (landscape), centred in drop 2. */
export const OUTLET = { x: FIRST_X + DROP_W + 0.08, y: 1.12, w: 0.17, h: 0.115, d: 0.022 } as const;

/** Drape depth (projection from the wall face) of the skirting ogee profile at height y (0..SKIRTING_H). */
export function skirtingDepth(y: number): number {
  return piecewise(y, [
    [0, 0.022],
    [0.0651, 0.022],
    [0.08, 0.016],
    [0.0966, 0.0092],
    [SKIRTING_H, 0],
  ]);
}

/** Drape depth of the cove cornice at height yl above its lower edge (0..CORNICE_H). */
export function corniceDepth(yl: number): number {
  return piecewise(yl, [
    [0, 0.012],
    [0.0135, 0.012],
    [0.03, 0.016],
    [0.045, 0.027],
    [0.0615, 0.053],
    [CORNICE_H, 0.065],
  ]);
}

function piecewise(x: number, pts: Array<[number, number]>): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x0, y0] = pts[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / Math.max(1e-9, x1 - x0);
  }
  return pts[pts.length - 1][1];
}
