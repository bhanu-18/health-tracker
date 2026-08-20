import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** 0..1. Values outside are clamped rather than overshooting the arc. */
  progress: number;
  /** [from, to] for the stroke gradient. */
  gradient: readonly [string, string];
  trackColor: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
};

/**
 * A circular progress arc with a gradient stroke.
 *
 * The arc starts at twelve o'clock rather than three, which is where people
 * expect a dial to begin, and sweeps clockwise.
 *
 * Animated on mount and on every change, because the fill is what communicates
 * "this is a proportion" -- a static arc reads as decoration, a moving one
 * reads as a measurement.
 */
export function ProgressRing({
  progress,
  gradient,
  trackColor,
  size = 200,
  strokeWidth = 16,
  children,
}: Props) {
  const clamped = Math.min(Math.max(progress, 0), 1);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Held in lazily-initialised state rather than a ref: reading ref.current
  // during render is what react-hooks/refs forbids, and this feeds a prop.
  const [dashOffset] = useState(() => new Animated.Value(circumference));

  useEffect(() => {
    Animated.timing(dashOffset, {
      toValue: circumference * (1 - clamped),
      duration: 900,
      // Decelerating: fast at first, settling at the end. A linear sweep looks
      // mechanical, and this is the screen's focal point.
      easing: Easing.out(Easing.cubic),
      // strokeDashoffset is not a transform, so it cannot run on the native
      // driver; the animation is short and on one element, so this is fine.
      useNativeDriver: false,
    }).start();
  }, [clamped, circumference, dashOffset]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient[0]} />
            <Stop offset="1" stopColor={gradient[1]} />
          </LinearGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          // Rotate so the arc begins at the top rather than the right.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {children}
    </View>
  );
}
