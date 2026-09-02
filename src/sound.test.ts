import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A fake AudioContext: enough of the graph (oscillator/gain/filter nodes,
// their scheduling methods) for sound.ts to run without throwing, so tests
// can assert on construction rather than on exact frequencies/envelopes.
function mockAudioContext() {
  const node = () => ({
    connect: vi.fn(),
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    type: "",
    start: vi.fn(),
    stop: vi.fn(),
  });

  return vi.fn(() => ({
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(node),
    createGain: vi.fn(node),
    createBiquadFilter: vi.fn(node),
  }));
}

describe("playActionSound", () => {
  beforeEach(() => {
    // sound.ts caches its AudioContext in module state, so each test needs a
    // fresh module instance to observe construction in isolation.
    vi.resetModules();
  });

  afterEach(() => {
    // @ts-expect-error test-only cleanup of a global this suite sets up
    window.AudioContext = undefined;
  });

  it("does not throw when AudioContext is unavailable", async () => {
    const { playActionSound } = await import("./sound");

    expect(() => playActionSound("delete")).not.toThrow();
    expect(() => playActionSound("keep")).not.toThrow();
  });

  it("constructs an AudioContext to play a delete sound", async () => {
    const ctor = mockAudioContext();
    window.AudioContext = ctor as unknown as typeof AudioContext;
    const { playActionSound } = await import("./sound");

    playActionSound("delete");

    expect(ctor).toHaveBeenCalledOnce();
  });

  it("constructs an AudioContext to play a keep sound", async () => {
    const ctor = mockAudioContext();
    window.AudioContext = ctor as unknown as typeof AudioContext;
    const { playActionSound } = await import("./sound");

    playActionSound("keep");

    expect(ctor).toHaveBeenCalledOnce();
  });

  it("reuses the same AudioContext across multiple calls", async () => {
    const ctor = mockAudioContext();
    window.AudioContext = ctor as unknown as typeof AudioContext;
    const { playActionSound } = await import("./sound");

    playActionSound("delete");
    playActionSound("keep");

    expect(ctor).toHaveBeenCalledOnce();
  });
});
