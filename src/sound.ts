import type { FileAction } from "./types";

// Lazily created and reused across calls instead of a fresh AudioContext
// per call. undefined = not yet attempted, null = attempted and
// unavailable (a deterministic environment-support gap, not something
// that resolves mid-session, so we don't retry construction on every call).
let audioContext: AudioContext | null | undefined;

function getAudioContext(): AudioContext | null {
  if (audioContext !== undefined) return audioContext;

  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new Ctor();
  } catch (_error) {
    // Silently fail if audio context is not available
    console.log("Audio feedback not available");
    audioContext = null;
  }

  return audioContext;
}

// Delete sound: Descending "whoosh" effect (like something being thrown away)
function playDeleteSound(ctx: AudioContext) {
  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  // Connect: oscillators -> filter -> gain -> destination
  oscillator1.connect(filter);
  oscillator2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Two oscillators for richer sound
  oscillator1.frequency.setValueAtTime(300, ctx.currentTime);
  oscillator1.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
  oscillator1.type = "sawtooth";

  oscillator2.frequency.setValueAtTime(200, ctx.currentTime);
  oscillator2.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
  oscillator2.type = "triangle";

  // Low-pass filter for "whoosh" effect
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);

  // Volume envelope
  gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  oscillator1.start(ctx.currentTime);
  oscillator1.stop(ctx.currentTime + 0.3);
  oscillator2.start(ctx.currentTime);
  oscillator2.stop(ctx.currentTime + 0.3);
}

// Keep sound: Ascending "chime" effect (like a positive confirmation)
function playKeepSound(ctx: AudioContext) {
  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const oscillator3 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  // Connect: oscillators -> filter -> gain -> destination
  oscillator1.connect(filter);
  oscillator2.connect(filter);
  oscillator3.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Three oscillators for a pleasant chord
  oscillator1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
  oscillator1.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.2); // E5
  oscillator1.type = "sine";

  oscillator2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
  oscillator2.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5
  oscillator2.type = "sine";

  oscillator3.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
  oscillator3.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.2); // C6
  oscillator3.type = "sine";

  // High-pass filter for bright, clear sound
  filter.type = "highpass";
  filter.frequency.setValueAtTime(400, ctx.currentTime);

  // Volume envelope with quick attack and decay
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

  oscillator1.start(ctx.currentTime);
  oscillator1.stop(ctx.currentTime + 0.25);
  oscillator2.start(ctx.currentTime);
  oscillator2.stop(ctx.currentTime + 0.25);
  oscillator3.start(ctx.currentTime);
  oscillator3.stop(ctx.currentTime + 0.25);
}

// Plays a short Web Audio sound for a keep/delete action. Always plays —
// callers decide whether sound is wanted (e.g. a settings toggle) before
// calling this.
export function playActionSound(action: FileAction): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (action === "delete") {
      playDeleteSound(ctx);
    } else {
      playKeepSound(ctx);
    }
  } catch (_error) {
    // Silently fail if playback itself throws
    console.log("Audio feedback not available");
  }
}
