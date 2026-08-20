import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  gradient: readonly [string, string];
  /** Must be unique on screen: SVG gradient ids are document-global. */
  id: string;
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  borderRadius?: number;
  /** [from, to] opacity. Low values give a wash; high values a solid panel. */
  opacity?: readonly [number, number];
};

/**
 * A view with a gradient wash behind its content.
 *
 * Measures itself rather than sizing the gradient with percentages --
 * react-native-svg does not resolve those against a flex parent, which
 * rendered the rect at a default size and left a hard seam across the card.
 * That bug shipped once; this component exists so it cannot ship again.
 */
export function GradientSurface({
  gradient,
  id,
  children,
  style,
  borderRadius = 16,
  opacity = [0.14, 0.04],
}: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current?.width === width && current?.height === height ? current : { width, height },
    );
  };

  return (
    <View style={[{ borderRadius, overflow: 'hidden' }, style]} onLayout={onLayout}>
      {size ? (
        <Svg style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id={`surface-${id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} stopOpacity={opacity[0]} />
              <Stop offset="1" stopColor={gradient[1]} stopOpacity={opacity[1]} />
            </LinearGradient>
          </Defs>
          <Rect
            width={size.width}
            height={size.height}
            fill={`url(#surface-${id})`}
            rx={borderRadius}
          />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
