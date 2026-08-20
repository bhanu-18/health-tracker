import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { useThemedStyles } from '../theme/useTheme';
import type { Theme } from '../theme/tokens';

type Props = TextProps & {
  /** Override the token colour for one-off emphasis (e.g. a metric colour). */
  color?: string;
};

/**
 * Typography primitives.
 *
 * Screens use these instead of raw <Text>, so the serif display face and the
 * type scale stay consistent without every component re-deciding them.
 */

/** The one big number or greeting per screen. Serif, by design. */
export function Display({ style, color, ...rest }: Props) {
  const styles = useThemedStyles(makeStyles);
  return <Text {...rest} style={[styles.display, color ? { color } : null, style]} />;
}

/** Section and screen headers. Serif. */
export function Heading({ style, color, ...rest }: Props) {
  const styles = useThemedStyles(makeStyles);
  return <Text {...rest} style={[styles.heading, color ? { color } : null, style]} />;
}

/** Card titles and list rows. */
export function Title({ style, color, ...rest }: Props) {
  const styles = useThemedStyles(makeStyles);
  return <Text {...rest} style={[styles.title, color ? { color } : null, style]} />;
}

export function Body({ style, color, ...rest }: Props) {
  const styles = useThemedStyles(makeStyles);
  return <Text {...rest} style={[styles.body, color ? { color } : null, style]} />;
}

/** Labels, units and secondary detail. */
export function Caption({ style, color, ...rest }: Props) {
  const styles = useThemedStyles(makeStyles);
  return <Text {...rest} style={[styles.caption, color ? { color } : null, style]} />;
}

/**
 * Declared at module scope so its identity is stable.
 *
 * A factory defined inside a component would be a new function on every render,
 * which defeats the memo in useThemedStyles and rebuilds the stylesheet every
 * time.
 */
const makeStyles = (t: Theme) => {
  const base: TextStyle = { color: t.colors.text };

  return StyleSheet.create({
    display: {
      ...base,
      fontFamily: t.fonts.display,
      fontSize: t.fontSize.hero,
      lineHeight: t.fontSize.hero * 1.05,
      letterSpacing: -1.5,
    },
    heading: {
      ...base,
      fontFamily: t.fonts.display,
      fontSize: t.fontSize.heading,
      letterSpacing: -0.4,
    },
    title: {
      ...base,
      fontSize: t.fontSize.title,
      fontWeight: '600',
    },
    body: {
      ...base,
      fontSize: t.fontSize.body,
    },
    caption: {
      ...base,
      color: t.colors.textMuted,
      fontSize: t.fontSize.caption,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      fontWeight: '600',
    },
  });
};
