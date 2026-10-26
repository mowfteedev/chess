import { expect, test } from "@playwright/test";
import { SoundManager } from "../../src/utils/sound";

function audioFixture(
  options: { blocked?: boolean; unavailable?: boolean } = {},
) {
  const calls = { contexts: 0, resumes: 0, starts: 0, volume: [] as number[] };
  const parameter = () => ({
    setValueAtTime(value: number) {
      calls.volume.push(value);
    },
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
  });
  class Context {
    state = options.blocked ? "suspended" : "running";
    currentTime = 0;
    destination = {};
    constructor() {
      calls.contexts++;
    }
    resume() {
      calls.resumes++;
      return options.blocked
        ? Promise.reject(new Error("Output unavailable"))
        : Promise.resolve();
    }
    createGain() {
      return { gain: parameter(), connect() {}, disconnect() {} };
    }
    createOscillator() {
      return {
        frequency: parameter(),
        connect() {},
        disconnect() {},
        stop() {},
        start() {
          calls.starts++;
        },
      };
    }
  }
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: options.unavailable ? {} : { AudioContext: Context },
  });
  return {
    calls,
    restore() {
      if (previous) Object.defineProperty(globalThis, "window", previous);
      else Reflect.deleteProperty(globalThis, "window");
    },
  };
}

test("sound unlock primes an output context before a future server event", () => {
  const audio = audioFixture();
  try {
    const sound = new SoundManager();
    sound.unlock();
    expect(audio.calls.contexts).toBe(1);
    expect(audio.calls.starts).toBe(0);
    sound.playJoin();
    expect(audio.calls.contexts).toBe(1);
    expect(audio.calls.starts).toBe(2);
  } finally {
    audio.restore();
  }
});

test("muting stops scheduled sound volume and prevents new oscillators", () => {
  const audio = audioFixture();
  try {
    const sound = new SoundManager();
    sound.playCastle();
    expect(audio.calls.starts).toBe(2);
    sound.setEnabled(false);
    expect(audio.calls.volume.at(-1)).toBe(0);
    sound.playMove();
    sound.playCapture();
    sound.playJoin();
    sound.playLeave();
    sound.playYourTurn();
    sound.playVictory();
    expect(audio.calls.starts).toBe(2);
    sound.setEnabled(true);
    sound.playMove();
    expect(audio.calls.starts).toBe(3);
  } finally {
    audio.restore();
  }
});

test("blocked autoplay or missing AudioContext cannot crash the game", async () => {
  for (const options of [{ blocked: true }, { unavailable: true }]) {
    const audio = audioFixture(options);
    try {
      const sound = new SoundManager();
      expect(() => sound.unlock()).not.toThrow();
      expect(() => sound.playMove()).not.toThrow();
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(audio.calls.resumes).toBe(options.blocked ? 2 : 0);
    } finally {
      audio.restore();
    }
  }
});
