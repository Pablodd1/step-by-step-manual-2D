import { pasteTheWallGuide, type WallpaperStep } from "./guide";
import type { LessonDefinition } from "../lesson/types";

/** The wallpaper lesson expressed through the construction-agnostic lesson contract. */
export const wallpaperLesson: LessonDefinition<WallpaperStep> = {
  id: "paste-the-wall",
  title: pasteTheWallGuide.title,
  disclaimer:
    "General teaching demo. Not a substitute for the roll label, adhesive datasheet, site risk assessment or qualified electrical work.",
  steps: pasteTheWallGuide.steps,
};
