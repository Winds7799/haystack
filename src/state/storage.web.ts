import type { StateStorage } from 'zustand/middleware';

/**
 * The browser stand-in for MMKV, which is native only.
 *
 * localStorage is synchronous and origin-scoped, which is the same shape the
 * native store has. It can also be absent or throw — private windows, blocked
 * site data — so every call degrades to an in-memory map rather than taking
 * the game down. Progress is then lost on refresh, which is a far better
 * failure than a blank screen.
 */

const NAMESPACE = 'haystack:';
const fallback = new Map<string, string>();

function available(): boolean {
  try {
    const probe = `${NAMESPACE}probe`;
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const usable = available();

export const deviceStorage: StateStorage = {
  setItem: (key, value) => {
    if (!usable) {
      fallback.set(key, value);
      return;
    }
    try {
      globalThis.localStorage.setItem(NAMESPACE + key, value);
    } catch {
      // Quota, most likely. Keep the run going in memory.
      fallback.set(key, value);
    }
  },
  getItem: (key) => {
    if (!usable) {
      return fallback.get(key) ?? null;
    }
    try {
      return globalThis.localStorage.getItem(NAMESPACE + key) ?? fallback.get(key) ?? null;
    } catch {
      return fallback.get(key) ?? null;
    }
  },
  removeItem: (key) => {
    fallback.delete(key);
    try {
      globalThis.localStorage.removeItem(NAMESPACE + key);
    } catch {
      // Already gone as far as anyone can tell.
    }
  },
};
