import { Platform } from 'react-native';

/**
 * Design tokens.
 *
 * Every colour, space and type value in the app comes from here. Components must
 * never hardcode a hex value -- if a colour is missing, add it to this file.
 * That is what makes a later restyle (or a dark mode) a one-file change.
 *
 * Direction: flat and restrained. No gradients, no drop shadows. Hierarchy comes
 * from size, weight and space -- not from decoration.
 */

/**
 * Each tracked metric owns a colour, and owns it everywhere: the same teal marks
 * steps on the dashboard, in the history chart and on the tab bar. The colour is
 * the metric's identity, so the user learns to read the screen by hue alone.
 */
export const metricColors = {
  food: '#D9543B',
  weight: '#C67A16',
  steps: '#1F7A6F',
  sleep: '#6B5B95',
} as const;

export type MetricKey = keyof typeof metricColors;

/**
 * Tints for filled backgrounds behind a metric (progress-bar tracks, badges).
 * Pre-computed rather than applied as runtime opacity, so a card never renders
 * a semi-transparent colour over an unexpected background.
 */
export const metricTints = {
  food: '#FBEDEA',
  weight: '#FAF1E1',
  steps: '#E7F2F0',
  sleep: '#EFEDF4',
} as const;

export const colors = {
  ...metricColors,

  /** Warm off-white. A pure #FFF page reads clinical; this reads calm. */
  background: '#FBF9F7',
  surface: '#FFFFFF',
  border: '#EBE5DF',

  text: '#1C1917',
  textMuted: '#78716C',
  textFaint: '#A8A29E',

  /** Solid dark primary action buttons, per the design direction. */
  primary: '#1C1917',
  primaryText: '#FBF9F7',

  /** Used sparingly -- over-budget calories, destructive actions. */
  danger: '#B4342A',
  success: '#1F7A6F',
} as const;

/**
 * A serif display face for headers and hero numbers is the single strongest
 * signal that this is not another generic sans-serif tracker.
 *
 * These are platform system serifs, which means zero font files to load and no
 * flash of unstyled text. Swapping in a custom face later (Fraunces, Instrument
 * Serif) is a change to this object only.
 */
export const fonts = {
  display: Platform.select({ ios: 'Georgia', default: 'serif' }),
  body: Platform.select({ ios: 'System', default: 'sans-serif' }),
} as const;

/** 4pt base scale. Using arbitrary values is what makes layouts drift. */
export const spacing = {
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
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  small: 14,
  body: 16,
  title: 20,
  heading: 26,
  /** Reserved for the one hero metric per screen. */
  hero: 64,
} as const;

export const theme = {
  colors,
  metricColors,
  metricTints,
  fonts,
  spacing,
  radius,
  fontSize,
} as const;

export type Theme = typeof theme;
