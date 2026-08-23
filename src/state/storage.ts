import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

const store = createMMKV({ id: 'haystack' });

/** Everything this game remembers lives on the device, in here. */
export const deviceStorage: StateStorage = {
  setItem: (key, value) => store.set(key, value),
  getItem: (key) => store.getString(key) ?? null,
  removeItem: (key) => {
    store.remove(key);
  },
};
