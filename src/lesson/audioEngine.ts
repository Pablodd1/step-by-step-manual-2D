import { VIDEO_HOLD_SECONDS, pacedStepSeconds } from "./pacing";
import type { LessonDefinition, LessonStepLike } from "./types";

export interface LessonExportPlan {
  indices: number[];
  perStepFrames: number[];
  introFrames: number[];
  introSeconds: number;
  totalFrames: number;
  seconds: number;
}

/** Check whether this browser supports AAC audio encoding via WebCodecs / mediabunny. */
export async function canEncodeAacAudio(): Promise<boolean> {
  if (typeof window === "undefined" || !("AudioEncoder" in window)) return false;
  try {
    const { canEncodeAudio } = await import("mediabunny");
    return await canEncodeAudio("aac", { sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 });
  } catch {
    return false;
  }
}

/**
 * Pure-math audio synthesis helper to render realistic instructional sound design:
 * - Title chord (warm, ambient acoustic chime)
 * - Step transition chimes (clean two-tone chime)
 * - Safety caution double-tone for electrical isolation
 * - Tool micro-sound effects (knife cut friction, brush sweep, roller texture, level ping, sponge wipe)
 * - Resolving completion chord
 */
export function synthesizeLessonAudio(
  lesson: LessonDefinition,
  indices: number[],
  introSeconds: number,
  totalSeconds: number,
  sampleRate = 48000,
): AudioBuffer {
  const totalSamples = Math.max(1, Math.ceil(totalSeconds * sampleRate));
  const fallbackChannels = [new Float32Array(totalSamples), new Float32Array(totalSamples)];
  const buffer =
    typeof AudioBuffer !== "undefined"
      ? new AudioBuffer({ length: totalSamples, numberOfChannels: 2, sampleRate })
      : ({
          length: totalSamples,
          numberOfChannels: 2,
          sampleRate,
          duration: totalSeconds,
          getChannelData(c: number) {
            return fallbackChannels[c];
          },
        } as unknown as AudioBuffer);

  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Seeded noise: Math.random() made every export's audio different, so the "deterministic" MP4 was not.
  let seed = 0x2f6b9d1 ^ lesson.id.length;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Helper: mix a tone into the channels with envelope and stereo pan (-1 left, +1 right)
  const mixTone = (
    startSec: number,
    freq: number,
    durationSec: number,
    amplitude: number,
    decayRate = 3,
    pan = 0,
    harmonics = [1],
  ) => {
    const startSample = Math.floor(startSec * sampleRate);
    const numSamples = Math.floor(durationSec * sampleRate);
    const leftGain = Math.cos(((pan + 1) * Math.PI) / 4);
    const rightGain = Math.sin(((pan + 1) * Math.PI) / 4);

    for (let i = 0; i < numSamples; i++) {
      const idx = startSample + i;
      if (idx >= totalSamples) break;
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.008); // 8ms anti-click attack
      const envelope = attack * Math.exp(-decayRate * t);

      let sampleVal = 0;
      for (let h = 0; h < harmonics.length; h++) {
        const hFreq = freq * (h + 1);
        const hAmp = harmonics[h];
        sampleVal += Math.sin(2 * Math.PI * hFreq * t) * hAmp;
      }
      const val = sampleVal * amplitude * envelope;
      left[idx] += val * leftGain;
      right[idx] += val * rightGain;
    }
  };

  // Helper: mix shaped noise (for blade slicing, roller rolling, brush sweep)
  const mixNoise = (
    startSec: number,
    durationSec: number,
    amplitude: number,
    pan = 0,
    pulseRate = 0,
  ) => {
    const startSample = Math.floor(startSec * sampleRate);
    const numSamples = Math.floor(durationSec * sampleRate);
    const leftGain = Math.cos(((pan + 1) * Math.PI) / 4);
    const rightGain = Math.sin(((pan + 1) * Math.PI) / 4);

    let lastNoise = 0;
    for (let i = 0; i < numSamples; i++) {
      const idx = startSample + i;
      if (idx >= totalSamples) break;
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.02);
      const release = Math.min(1, (durationSec - t) / 0.04);
      const envelope = Math.max(0, attack * release);
      const pulse = pulseRate > 0 ? 0.7 + 0.3 * Math.sin(2 * Math.PI * pulseRate * t) : 1;

      // Filtered pink-ish noise
      const white = random() * 2 - 1;
      lastNoise = lastNoise * 0.7 + white * 0.3;
      const val = lastNoise * amplitude * envelope * pulse;

      left[idx] += val * leftGain;
      right[idx] += val * rightGain;
    }
  };

  // 1. Intro sequence
  if (introSeconds > 0) {
    // Rich, warm instructional welcome chord (D major: D3, A3, D4, F#4, A4)
    const chord = [
      { freq: 146.83, amp: 0.14, pan: -0.2, decay: 1.8, harmonics: [1, 0.4, 0.15] },
      { freq: 220.0, amp: 0.16, pan: 0.2, decay: 2.0, harmonics: [1, 0.3, 0.2] },
      { freq: 293.66, amp: 0.18, pan: -0.1, decay: 2.2, harmonics: [1, 0.5, 0.25] },
      { freq: 369.99, amp: 0.15, pan: 0.1, decay: 2.2, harmonics: [1, 0.4] },
      { freq: 440.0, amp: 0.12, pan: 0.0, decay: 2.5, harmonics: [1, 0.6, 0.3] },
    ];
    chord.forEach((note) => {
      mixTone(0.3, note.freq, 3.2, note.amp, note.decay, note.pan, note.harmonics);
    });
  }

  // 2. Step sequence
  let currentTime = introSeconds;
  for (let k = 0; k < indices.length; k++) {
    const stepIdx = indices[k];
    const step = lesson.steps[stepIdx];
    const stepDuration = pacedStepSeconds(step);

    const isSafetyStep = step.operation === "safety";
    if (isSafetyStep) {
      // Distinctive electrical safety caution double-tone (440Hz -> 330Hz)
      mixTone(currentTime + 0.15, 440, 0.35, 0.22, 4.5, -0.1, [1, 0.35, 0.15]);
      mixTone(currentTime + 0.45, 330, 0.55, 0.25, 3.5, 0.1, [1, 0.4, 0.2]);
    } else {
      // Clean instructional transition chime (587.3Hz / D5 -> 880Hz / A5)
      mixTone(currentTime + 0.12, 587.33, 0.4, 0.12, 5.0, -0.15, [1, 0.3]);
      mixTone(currentTime + 0.28, 880.0, 0.5, 0.14, 4.2, 0.15, [1, 0.25]);
    }

    // Tool sound effects, placed at the same choreography progress the video shows them
    // (videoProgress(): hold, then progress 0..1 over the active span). They used to sit at fixed
    // 1–3 s offsets, so most of a 15–20 s paced step was silent, and the knife/seam cases were keyed on
    // operation names ("cut-top", "relief-cuts", "seam-roll") that the wallpaper lesson never uses.
    const active = Math.max(0.001, stepDuration - VIDEO_HOLD_SECONDS * 2);
    const at = (progress: number) => currentTime + VIDEO_HOLD_SECONDS + progress * active;
    const span = (p0: number, p1: number) => Math.max(0.05, (p1 - p0) * active);
    const knifeStroke = (p0: number, p1: number) => {
      mixNoise(at(p0), span(p0, p1), 0.085, 0.1, 14);
      mixTone(at(p0), 1850, 0.18, 0.04, 12, 0.1);
    };
    switch (step.operation) {
      case "trim": {
        knifeStroke(0.02, 0.48);
        knifeStroke(0.52, 0.98);
        break;
      }
      case "outlet": {
        knifeStroke(0.08, 0.38);
        knifeStroke(0.42, 0.72);
        break;
      }
      case "paste": {
        mixNoise(at(0), span(0, 0.72), 0.06, -0.05, 4); // roller
        mixNoise(at(0.72), span(0.72, 1), 0.05, 0.1, 9); // brush cut-in
        break;
      }
      case "hang": {
        mixNoise(at(0.3), span(0.3, 1), 0.035, 0, 1.5); // paper unrolling
        break;
      }
      case "smooth": {
        for (let k = 0; k < 6; k++) mixNoise(at(k / 6), span(k / 6, (k + 0.9) / 6), 0.06, k % 2 ? -0.3 : 0.3, 2);
        break;
      }
      case "match": {
        mixNoise(at(0), span(0, 0.24), 0.06, -0.05, 4);
        mixNoise(at(0.54), span(0.54, 0.8), 0.035, 0, 1.5);
        for (let k = 0; k < 6; k++) mixNoise(at(0.8 + (k / 6) * 0.2), span(0, 0.03), 0.05, k % 2 ? -0.3 : 0.3, 2);
        break;
      }
      case "plumb": {
        mixTone(at(0.15), 1174.66, 0.45, 0.1, 6.0, 0.0, [1, 0.2]); // level settles
        mixNoise(at(0.2), span(0.2, 1), 0.025, 0.05, 6); // pencil line
        break;
      }
      case "prepare": {
        mixNoise(at(0), span(0, 0.48), 0.05, -0.1, 5); // filling knife
        mixNoise(at(0.48), span(0.48, 1), 0.07, 0.1, 3); // sponge
        break;
      }
      case "clean": {
        mixNoise(at(0), span(0, 1), 0.07, 0, 3);
        break;
      }
      case "inspect": {
        // Resolving celebratory/completion chime
        mixTone(currentTime + 0.8, 587.33, 1.5, 0.15, 2.0, -0.2, [1, 0.4]);
        mixTone(currentTime + 1.1, 739.99, 1.8, 0.16, 1.8, 0.0, [1, 0.35]);
        mixTone(currentTime + 1.4, 880.0, 2.2, 0.18, 1.6, 0.2, [1, 0.3]);
        mixTone(currentTime + 1.7, 1174.66, 2.5, 0.15, 1.4, 0.0, [1, 0.25]);
        break;
      }
    }

    currentTime += stepDuration;
  }

  // Soft master clamp/limiter to prevent clipping
  for (let i = 0; i < totalSamples; i++) {
    left[i] = Math.max(-0.95, Math.min(0.95, left[i]));
    right[i] = Math.max(-0.95, Math.min(0.95, right[i]));
  }

  return buffer;
}

let sharedAudioCtx: AudioContext | null = null;

/** Play a single interactive sound cue in the browser (for interactive step navigation). */
export function playLiveStepCue(step: LessonStepLike, volume = 0.2) {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }

  const now = sharedAudioCtx.currentTime;
  const isSafety = step.operation === "safety";

  if (isSafety) {
    const osc1 = sharedAudioCtx.createOscillator();
    const osc2 = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc1.frequency.setValueAtTime(440, now);
    osc2.frequency.setValueAtTime(330, now + 0.2);
    gain.gain.setValueAtTime(volume * 1.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.55);
  } else {
    const osc1 = sharedAudioCtx.createOscillator();
    const osc2 = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    osc2.frequency.setValueAtTime(880.0, now + 0.12);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  }
}
