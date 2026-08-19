import { Text, type TextProps, type TextStyle, StyleSheet } from 'react-native';
import { colors, fonts, fontSize } from '../theme/tokens';

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
  return <Text {...rest} style={[styles.display, color ? { color } : null, style]} />;
}

/** Section and screen headers. Serif. */
export function Heading({ style, color, ...rest }: Props) {
  return <Text {...rest} style={[styles.heading, color ? { color } : null, style]} />;
}

/** Card titles and list rows. */
export function Title({ style, color, ...rest }: Props) {
  return <Text {...rest} style={[styles.title, color ? { color } : null, style]} />;
}

export function Body({ style, color, ...rest }: Props) {
  return <Text {...rest} style={[styles.body, color ? { color } : null, style]} />;
}

/** Labels, units and secondary detail. */
export function Caption({ style, color, ...rest }: Props) {
  return <Text {...rest} style={[styles.caption, color ? { color } : null, style]} />;
}

const base: TextStyle = { color: colors.text };

const styles = StyleSheet.create({
  display: {
    ...base,
    fontFamily: fonts.display,
    fontSize: fontSize.hero,
    lineHeight: fontSize.hero * 1.05,
    letterSpacing: -1.5,
  },
  heading: {
    ...base,
    fontFamily: fonts.display,
    fontSize: fontSize.heading,
    letterSpacing: -0.4,
  },
  title: {
    ...base,
    fontSize: fontSize.title,
    fontWeight: '600',
  },
  body: {
    ...base,
    fontSize: fontSize.body,
  },
  caption: {
    ...base,
    color: colors.textMuted,
    fontSize: fontSize.caption,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
