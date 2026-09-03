import { boardPalette } from '@/ui/tokens';
import type { LevelConfig } from './difficulty';
import type { Ground } from './types';

/**
 * Lives apart from the level curve on purpose. `difficulty.ts` is pure data
 * with no react-native import, so the tools that generate the database bounds
 * and the docs can read it straight from Node.
 */
export function groundFor(config: LevelConfig): Ground {
  return boardPalette[config.world.ground];
}
