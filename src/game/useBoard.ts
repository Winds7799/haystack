import { useEffect, useRef, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import { outerOf, textureFor } from './constants';
import { findLevel, type Modifier } from './difficulty';
import { generateWorld } from './generate';
import { rasterizeWorld } from './render';
import type { World } from './types';

/**
 * Freeing a texture the moment nothing in React references it is still too
 * early: Skia's renderer can have a draw queued against it for a frame or two
 * after the component that owned it is gone, and drawing a deleted image is a
 * hard crash rather than a blank. Two seconds is far beyond any queued frame
 * and far short of the next board, so one spare texture is held briefly and
 * nothing is ever drawn after it is freed.
 */
const RETIRE_AFTER = 2000;

function retire(texture: SkImage): void {
  setTimeout(() => {
    try {
      texture.dispose();
    } catch {
      // Already gone. Nothing to do and nothing worth saying.
    }
  }, RETIRE_AFTER);
}

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
          retire(previous);
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

    // Deliberately no disposal here. This cleanup also runs when a dependency
    // changes — a retry, a new level, Fast Refresh — and the state still
    // holds the old texture for at least one more render. The next build
    // releases it once the replacement is in place; unmount is handled below.
    return () => {
      cancelled = true;
      cancelAnimationFrame(pending);
    };
  }, [levelId, attempt, colourBlindSafe, modifierOverride]);

  // True unmount only: nothing can draw the texture once the screen is gone,
  // so a frame of grace is all it needs.
  useEffect(
    () => () => {
      const doomed = live.current;
      live.current = null;
      if (doomed) {
        retire(doomed);
      }
    },
    []
  );

  return state;
}
