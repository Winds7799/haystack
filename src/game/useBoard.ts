import { useEffect, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import { TEXTURE_SIZE } from './constants';
import { findLevel } from './difficulty';
import { generateWorld } from './generate';
import { rasterizeWorld } from './render';
import type { World } from './types';

export type BoardState =
  | { status: 'loading' }
  | { status: 'ready'; world: World; texture: SkImage }
  | { status: 'error'; message: string };

/**
 * Builds a board and bakes it into a texture. Both steps are heavy and
 * synchronous, so they run a couple of frames after mount and the caller shows
 * a loading state until they land.
 */
export function useBoard(levelId: number, attempt: number): BoardState {
  const [state, setState] = useState<BoardState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let pending = 0;
    setState({ status: 'loading' });

    const build = () => {
      if (cancelled) {
        return;
      }
      const config = findLevel(levelId);
      if (!config) {
        setState({ status: 'error', message: `There is no level ${levelId}.` });
        return;
      }
      try {
        const world = generateWorld(config, attempt);
        const texture = rasterizeWorld(world, TEXTURE_SIZE);
        if (!cancelled) {
          setState({ status: 'ready', world, texture });
        }
      } catch (cause) {
        if (!cancelled) {
          const message = cause instanceof Error ? cause.message : 'The board could not be built.';
          setState({ status: 'error', message });
        }
      }
    };

    // One frame to paint the loading state, one to let it settle.
    pending = requestAnimationFrame(() => {
      pending = requestAnimationFrame(build);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(pending);
    };
  }, [levelId, attempt]);

  return state;
}
