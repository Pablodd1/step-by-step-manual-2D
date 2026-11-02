import { pacedStepSeconds } from "./pacing";
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
      const white = (Math.random() * 2 - 1);
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

    // Tool sound effects during the step
    switch (step.operation) {
      case "cut-top":
      case "relief-cuts":
      case "drop-length": {
        // Knife blade friction glide sound
        mixNoise(currentTime + 1.2, 1.4, 0.09, 0.1, 14);
        mixTone(currentTime + 1.2, 1850, 0.18, 0.04, 12, 0.1);
        break;
      }
      case "paste": {
        // Paste roller texture
        mixNoise(currentTime + 1.0, 2.0, 0.07, -0.05, 4);
        break;
      }
      case "seam-roll": {
        // Seam roller tactile clicks and roll
        mixNoise(currentTime + 1.1, 1.8, 0.06, 0.0, 8);
        mixTone(currentTime + 1.5, 920, 0.08, 0.05, 18, 0.05);
        mixTone(currentTime + 2.2, 940, 0.08, 0.05, 18, 0.05);
        break;
      }
      case "smooth": {
        // Smoother sweeping sound across paper
        mixNoise(currentTime + 0.9, 1.8, 0.07, 0.0, 2);
        break;
      }
      case "plumb": {
        // Spirit level alignment ping
        mixTone(currentTime + 1.8, 1174.66, 0.45, 0.1, 6.0, 0.0, [1, 0.2]);
        break;
      }
      case "prepare":
      case "clean": {
        // Damp sponge wipe whisper
        mixNoise(currentTime + 1.0, 1.2, 0.08, -0.1, 3);
        mixNoise(currentTime + 2.4, 1.2, 0.07, 0.1, 3);
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
