import type { BoardPaletteName } from '@/ui/tokens';

/** The five stretches of six levels, and what each one is about. */
export interface WorldSpec {
  name: string;
  ground: BoardPaletteName;
}

export const BARN: WorldSpec = { name: 'Barn', ground: 'barn' };
export const LOFT: WorldSpec = { name: 'Loft', ground: 'loft' };
export const DUSK: WorldSpec = { name: 'Dusk', ground: 'dusk' };
export const STORM: WorldSpec = { name: 'Storm', ground: 'storm' };
export const NIGHTFALL: WorldSpec = { name: 'Nightfall', ground: 'nightfall' };
export const THRESHER: WorldSpec = { name: 'Thresher', ground: 'thresher' };
export const GRANARY: WorldSpec = { name: 'Granary', ground: 'granary' };
export const RAFTERS: WorldSpec = { name: 'Rafters', ground: 'rafters' };
export const BLACKOUT: WorldSpec = { name: 'Blackout', ground: 'blackout' };
export const CHAFF: WorldSpec = { name: 'Chaff', ground: 'chaff' };
