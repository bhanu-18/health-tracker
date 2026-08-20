import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  size?: number;
  /** Must be unique on screen: SVG gradient ids are document-global. */
  id: string;
};

/**
 * A circular gradient chip with an icon.
 *
 * Extracted from the dashboard card so every screen draws it identically --
 * this is the element that visually ties the app together, and two slightly
 * different versions would be worse than none.
 *
 * Sized explicitly rather than with percentages: react-native-svg does not
 * resolve those against a flex parent, which is what left a seam across the
 * dashboard cards.
 */
export function GradientBadge({ icon, gradient, size = 28, id }: Props) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg style={StyleSheet.absoluteFill} width={size} height={size}>
        <Defs>
          <LinearGradient id={`badge-${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient[0]} />
            <Stop offset="1" stopColor={gradient[1]} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#badge-${id})`} rx={size / 2} />
      </Svg>
      <Ionicons name={icon} size={Math.round(size * 0.54)} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
