import { useEffect, useRef, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import { outerOf, textureFor } from './constants';
import { findLevel, type Modifier } from './difficulty';
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
 *
 * A board texture is the largest thing this game allocates, so the previous one
 * is released the moment a new one lands rather than left for the collector.
 * That is what keeps twenty levels back to back flat on memory.
 */
export function useBoard(
  levelId: number,
  attempt: number,
  colourBlindSafe: boolean,
  modifierOverride?: Modifier | 'none'
): BoardState {
  const [state, setState] = useState<BoardState>({ status: 'loading' });
  const live = useRef<SkImage | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pending = 0;
    setState({ status: 'loading' });

    // Freeing a texture the moment it is replaced is too early: React has
    // committed the new state but Skia has not yet painted a frame without the
    // old image, and drawing a deleted one is a hard crash. One frame of grace
    // is enough, and still releases it long before another board is built.
    const releaseAfterAFrame = (doomed: SkImage) => {
      requestAnimationFrame(() => {
        try {
          doomed.dispose();
        } catch {
          // Already gone. Nothing to do and nothing worth saying.
        }
      });
    };

    const build = () => {
      if (cancelled) {
        return;
      }
      const found = findLevel(levelId);
      if (!found) {
        setState({ status: 'error', message: `There is no level ${levelId}.` });
        return;
      }
      const config =
        modifierOverride === undefined
          ? found
          : { ...found, modifier: modifierOverride === 'none' ? undefined : modifierOverride };
      try {
        const world = generateWorld(config, attempt, colourBlindSafe);
        const texture = rasterizeWorld(world, textureFor(outerOf(world)));
        if (cancelled) {
          texture.dispose();
          return;
        }
        const previous = live.current;
        live.current = texture;
        setState({ status: 'ready', world, texture });
        if (previous) {
          releaseAfterAFrame(previous);
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
      const doomed = live.current;
      live.current = null;
      if (doomed) {
        releaseAfterAFrame(doomed);
      }
    };
  }, [levelId, attempt, colourBlindSafe, modifierOverride]);

  return state;
}
