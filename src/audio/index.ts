import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

/**
 * Sound is a garnish. Every call here is fire and forget and swallows its own
 * failure: nothing in the game waits on audio loading, and a device with no
 * working audio route plays the whole game exactly as well.
 */

const SOURCES = {
  ambience: require('../../assets/audio/barn.wav'),
  rustle: require('../../assets/audio/rustle.wav'),
  clack: require('../../assets/audio/clack.wav'),
  find: require('../../assets/audio/find.wav'),
  tap: require('../../assets/audio/tap.wav'),
} as const;

export type Cue = keyof typeof SOURCES;

const LEVEL: Record<Cue, number> = {
  ambience: 0.18,
  rustle: 0.28,
  clack: 0.5,
  find: 0.45,
  tap: 0.32,
};

/** Straw does not rustle more often than this, however fast the panning is. */
const RUSTLE_GAP = 220;

const players = new Map<Cue, AudioPlayer>();
let enabled = true;
let lastRustle = 0;

function attempt(run: () => void): void {
  try {
    run();
  } catch {
    // A missing audio route is not a reason to interrupt a level.
  }
}

function playerFor(cue: Cue): AudioPlayer | null {
  const existing = players.get(cue);
  if (existing) {
    return existing;
  }
  let made: AudioPlayer | null = null;
  attempt(() => {
    made = createAudioPlayer(SOURCES[cue]);
    made.volume = LEVEL[cue];
    if (cue === 'ambience') {
      made.loop = true;
    }
    players.set(cue, made);
  });
  return made;
}

/**
 * Respecting the mute switch is the point of `playsInSilentMode: false` — a
 * silenced phone stays silent without the game having to ask.
 */
export function prepareAudio(): void {
  attempt(() => {
    void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false });
  });
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  if (!value) {
    stopAmbience();
  }
}

export function play(cue: Cue): void {
  if (!enabled) {
    return;
  }
  if (cue === 'rustle') {
    const now = Date.now();
    if (now - lastRustle < RUSTLE_GAP) {
      return;
    }
    lastRustle = now;
  }
  const player = playerFor(cue);
  if (!player) {
    return;
  }
  attempt(() => {
    void player.seekTo(0);
    player.play();
  });
}

export function startAmbience(): void {
  if (!enabled) {
    return;
  }
  const player = playerFor('ambience');
  attempt(() => player?.play());
}

export function stopAmbience(): void {
  attempt(() => players.get('ambience')?.pause());
}
