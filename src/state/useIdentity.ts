import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deviceStorage } from './storage';

/**
 * Who this device is on the leaderboard. There are no accounts: a random id
 * generated on first run is the key, and the display name is just a label
 * hanging off it. Reinstalling the app starts a new player, which is the
 * honest trade for asking nobody to sign in.
 */

export const NAME_LIMIT = 24;

interface IdentityState {
  /** Stable per install. Never shown, never sent anywhere but the score row. */
  playerId: string;
  name: string;
  setName: (name: string) => void;
}

function newPlayerId(): string {
  // Not cryptographic — it only has to be unguessable enough that nobody
  // stumbles onto someone else's row, and unique enough not to collide.
  const chunk = () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
  const raw = `${chunk()}${chunk()}${chunk()}${chunk()}`;
  return [
    raw.slice(0, 8),
    raw.slice(8, 12),
    `4${raw.slice(13, 16)}`,
    ((Number.parseInt(raw[16], 16) & 0x3) | 0x8).toString(16) + raw.slice(17, 20),
    raw.slice(20, 32),
  ].join('-');
}

/** Trims, collapses runs of spaces, and cuts to the length the server accepts. */
export function tidyName(input: string): string {
  return input.replace(/\s+/g, ' ').trim().slice(0, NAME_LIMIT);
}

export const useIdentity = create<IdentityState>()(
  persist(
    (set) => ({
      playerId: newPlayerId(),
      name: '',
      setName: (name) => set({ name: tidyName(name) }),
    }),
    {
      name: 'identity',
      storage: createJSONStorage(() => deviceStorage),
    }
  )
);

/** True once the player has chosen what to be called. */
export function hasName(): boolean {
  return useIdentity.getState().name.length > 0;
}
