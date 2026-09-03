import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Skia is compiled into the app on iOS and Android, but on the web it is a
 * WebAssembly module that has to be fetched and instantiated first. Touching a
 * canvas before that finishes throws, so the whole tree waits.
 */
export function useSkiaReady(): boolean {
  const [ready, setReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    let cancelled = false;
    import('@shopify/react-native-skia/lib/module/web')
      .then(({ LoadSkiaWeb }) => LoadSkiaWeb())
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch(() => {
        // Nothing renders without it, so surface the failure rather than
        // hanging on a blank screen forever.
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
