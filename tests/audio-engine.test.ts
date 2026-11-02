import { describe, expect, it } from "vitest";
import { synthesizeLessonAudio } from "../src/lesson/audioEngine";
import { wallpaperLesson } from "../src/wallpaper/lesson";

describe("audioEngine", () => {
  it("synthesizes valid stereo audio buffer with expected sample count and duration", () => {
    const indices = [0, 1, 2];
    const introSeconds = 4;
    const totalSeconds = 25;
    const sampleRate = 48000;

    const buffer = synthesizeLessonAudio(wallpaperLesson, indices, introSeconds, totalSeconds, sampleRate);
    expect(buffer.numberOfChannels).toBe(2);
    expect(buffer.sampleRate).toBe(48000);
    expect(buffer.length).toBe(totalSeconds * sampleRate);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    expect(left.length).toBe(buffer.length);
    expect(right.length).toBe(buffer.length);

    // Ensure audio contains actual non-zero signal (not silence)
    let maxLeft = 0;
    let maxRight = 0;
    for (let i = 0; i < left.length; i++) {
      if (Math.abs(left[i]) > maxLeft) maxLeft = Math.abs(left[i]);
      if (Math.abs(right[i]) > maxRight) maxRight = Math.abs(right[i]);
    }

    expect(maxLeft).toBeGreaterThan(0.05);
    expect(maxRight).toBeGreaterThan(0.05);

    // Ensure limiter prevented clipping (> 0.96)
    expect(maxLeft).toBeLessThanOrEqual(0.96);
    expect(maxRight).toBeLessThanOrEqual(0.96);
  });

  it("produces silence or clean output for single step without intro", () => {
    const indices = [5];
    const introSeconds = 0;
    const totalSeconds = 8;
    const buffer = synthesizeLessonAudio(wallpaperLesson, indices, introSeconds, totalSeconds, 48000);
    expect(buffer.length).toBe(8 * 48000);
    const left = buffer.getChannelData(0);
    let hasSignal = false;
    for (let i = 0; i < left.length; i++) {
      if (Math.abs(left[i]) > 0.01) {
        hasSignal = true;
        break;
      }
    }
    expect(hasSignal).toBe(true);
  });
});
