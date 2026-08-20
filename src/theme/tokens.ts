import { Platform } from 'react-native';

/**
 * Design tokens, in light and dark.
 *
 * Every colour, space and type value in the app comes from here. Components
 * must never hardcode a hex value -- if a colour is missing, add it. That is
 * what made adding a dark palette a change to this file plus a hook, rather
 * than a hunt through every screen.
 *
 * Direction: flat and restrained. No gradients, no drop shadows. Hierarchy from
 * size, weight and space rather than decoration.
 */

/**
 * Each tracked metric owns a colour, and owns it everywhere: the same teal
 * marks steps on the dashboard, in the history chart and on the tab bar. The
 * colour is the metric's identity, so the screen can be read by hue alone.
 */
const metricColorsLight = {
  food: '#D9543B',
  weight: '#C67A16',
  steps: '#1F7A6F',
  sleep: '#6B5B95',
} as const;

/**
 * Dark-mode metric colours are lighter and less saturated, not the same hues.
 *
 * The light values were chosen against a warm off-white; on a near-black
 * background the deep teal and purple lose contrast and read as muddy grey.
 * These keep the four distinguishable from each other while staying legible.
 */
const metricColorsDark = {
  food: '#F0866B',
  weight: '#E0A34A',
  steps: '#4FB8A8',
  sleep: '#A392CE',
} as const;

export type MetricKey = keyof typeof metricColorsLight;

/**
 * Tints for filled backgrounds behind a metric (progress-bar tracks, badges).
 * Pre-computed rather than runtime opacity, so a card never renders a
 * semi-transparent colour over an unexpected background.
 */
const metricTintsLight = {
  food: '#FBEDEA',
  weight: '#FAF1E1',
  steps: '#E7F2F0',
  sleep: '#EFEDF4',
} as const;

/** Dark tints are deep, desaturated versions of each hue, not pale washes. */
const metricTintsDark = {
  food: '#33211D',
  weight: '#31271A',
  steps: '#162C29',
  sleep: '#262231',
} as const;

const lightColors = {
  ...metricColorsLight,

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
 * Dark is warm-toned rather than pure black, mirroring the light palette's
 * warmth. A true #000 with white text is harsher than anything else here.
 */
const darkColors = {
  ...metricColorsDark,

  background: '#171513',
  surface: '#221F1D',
  border: '#37322E',

  text: '#F5F1EC',
  textMuted: '#A9A29C',
  textFaint: '#7C736C',

  /** Inverted: a light button on a dark page carries the same weight. */
  primary: '#F5F1EC',
  primaryText: '#171513',

  danger: '#F08079',
  success: '#4FB8A8',
} as const;

/**
 * A serif display face for headers and hero numbers is the single strongest
 * signal that this is not another generic sans-serif tracker.
 *
 * Platform system serifs, so there are no font files to load and no flash of
 * unstyled text. Swapping in a custom face later is a change to this object.
 */
export const fonts = {
  display: Platform.select({ ios: 'Georgia', default: 'serif' }),
  body: Platform.select({ ios: 'System', default: 'sans-serif' }),
} as const;

/** 4pt base scale. Arbitrary values are what make layouts drift. */
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

/**
 * The palettes are `as const`, which makes each value its own literal type --
 * so the dark palette is not assignable to `typeof lightColors`. Widening to
 * string here keeps the key names checked (a typo is still an error) while
 * letting the two palettes share a type.
 */
/** Widened for the same reason as the palettes: `as const` makes literals. */
type Shadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

type Palette = Record<keyof typeof lightColors, string>;
type MetricPalette = Record<MetricKey, string>;

/**
 * Gradient pairs per metric, [from, to].
 *
 * Each stays within its metric's hue rather than crossing into another -- a
 * coral-to-purple sweep would look striking once and then make two metrics
 * indistinguishable at a glance, which is the whole point of the colour coding.
 */
const metricGradientsLight = {
  food: ['#F0785C', '#D9543B'],
  weight: ['#E0A34A', '#C67A16'],
  steps: ['#35A192', '#1F7A6F'],
  sleep: ['#8B7ABA', '#6B5B95'],
} as const;

const metricGradientsDark = {
  food: ['#F5A48E', '#E06A4E'],
  weight: ['#EDBA6B', '#D08F2C'],
  steps: ['#6FD0BF', '#3A9C8C'],
  sleep: ['#BCACE0', '#8877B8'],
} as const;

/**
 * Elevation.
 *
 * Deliberately soft and tinted rather than the default black: a grey drop
 * shadow on a warm background reads as dirt. Kept to two levels, because a
 * third invites every card to argue about which is more important.
 */
const shadowsLight = {
  card: {
    shadowColor: '#7C6A5A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  raised: {
    shadowColor: '#7C6A5A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

/**
 * On a dark background a shadow cannot be seen, so depth comes from a lighter
 * surface instead. These stay defined so components need no branching, but the
 * opacity is low enough to be almost inert.
 */
const shadowsDark = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 3,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export type Theme = {
  isDark: boolean;
  colors: Palette;
  metricColors: MetricPalette;
  metricTints: MetricPalette;
  metricGradients: Record<MetricKey, readonly [string, string]>;
  shadows: Record<keyof typeof shadowsLight, Shadow>;
  fonts: typeof fonts;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
};

const shared = { fonts, spacing, radius, fontSize };

export const lightTheme: Theme = {
  isDark: false,
  colors: lightColors,
  metricColors: metricColorsLight,
  metricTints: metricTintsLight,
  metricGradients: metricGradientsLight,
  shadows: shadowsLight,
  ...shared,
};

export const darkTheme: Theme = {
  isDark: true,
  colors: darkColors,
  metricColors: metricColorsDark,
  metricTints: metricTintsDark,
  metricGradients: metricGradientsDark,
  shadows: shadowsDark,
  ...shared,
};

/** What the user picked. 'auto' follows the phone. */
export type ThemeMode = 'light' | 'dark' | 'auto';
