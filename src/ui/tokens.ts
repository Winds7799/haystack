import { Platform } from 'react-native';

/**
 * The single source of design values. A raw hex string, font size or spacing
 * step appearing anywhere else in the codebase is a bug.
 */

export const color = {
  /** Ground for every screen, and the colour the board fades to at its edges. */
  ink: '#0A0705',
  surface: '#180F09',
  surfaceHigh: '#241710',
  border: '#3B2717',
  /** Straw gold: the one accent colour in the interface. */
  gold: '#D39B3C',
  goldDim: '#8A6323',
  text: '#F0E2CB',
  textMuted: '#9C876C',
  /** Cold steel belongs to the needle and the decoys. Never to UI chrome. */
  steel: '#CFD6DE',
  steelDeep: '#79838F',
  steelDark: '#4A525C',
  /** Pale split wood, for splinters. Not a chrome colour either. */
  wood: '#B6A183',
  shadow: '#050403',
  /** Laid over the board when a panel takes the screen. */
  scrim: '#0A0705D9',
  warning: '#A83B27',
} as const;

/** Board grounds, one per world. Each is dimmer and cooler than the last. */
export const boardPalette = {
  barn: { centre: '#4A3416', edge: color.ink },
  loft: { centre: '#3D2C15', edge: '#080609' },
  dusk: { centre: '#2B2317', edge: '#060507' },
  storm: { centre: '#242320', edge: '#050607' },
  nightfall: { centre: '#191510', edge: '#030304' },
} as const;

/** Overlays the modifiers paint across the board. */
export const veil = {
  /** Warm fog that lifts the blacks and flattens the pile. */
  haze: '#9C8A6E',
  /** Everything outside the lantern. */
  night: '#040303',
} as const;

export type BoardPaletteName = keyof typeof boardPalette;

/** Straw colour range, as hue degrees and 0..1 saturation / lightness. */
export const strawHsl = {
  hue: [33, 48],
  saturation: [0.38, 0.72],
  lightness: [0.24, 0.62],
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 18,
  pill: 999,
} as const;

export const type = {
  display: 34,
  title: 24,
  heading: 18,
  body: 15,
  label: 13,
  caption: 11,
} as const;

export const font = {
  /** An old-style serif, for the wordmark and every heading. */
  display: 'EBGaramond_500Medium',
  displayPlain: 'EBGaramond_400Regular',
  /** Body copy stays on the system face: it scales and hyphenates best. */
  body: Platform.select({ ios: 'System', default: 'sans-serif' }),
  /** Anything numeric, so digits never jitter as they change. */
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

export const layout = {
  /** Minimum touch target, in points. */
  touchTarget: 44,
} as const;

export const motion = {
  quick: 140,
  normal: 240,
  slow: 420,
} as const;
