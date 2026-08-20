import { useEffect, useState } from 'react';
import { Animated, Easing, type TextStyle } from 'react-native';

type Props = {
  value: number;
  style?: TextStyle | TextStyle[];
  /** Rendered around the animating figure, e.g. thousands separators. */
  format?: (value: number) => string;
  durationMs?: number;
};

/**
 * A number that counts up to its value.
 *
 * Worth the machinery only on a screen's focal figure. The movement is what
 * makes the value feel measured rather than printed, and it draws the eye to
 * the one number the screen exists to show.
 *
 * Everything else on the dashboard appears instantly: animating every figure
 * would make the screen restless and, worse, make nothing look important.
 */
export function AnimatedNumber({ value, style, format, durationMs = 900 }: Props) {
  const [animated] = useState(() => new Animated.Value(0));
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    animated.setValue(0);

    const listener = animated.addListener(({ value: t }) => {
      setDisplay(Math.round(value * t));
    });

    Animated.timing(animated, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      // Driving JS state from the listener, so this cannot be native-driven.
      useNativeDriver: false,
    }).start();

    return () => {
      animated.removeListener(listener);
      // Land exactly on the target if the animation is cut short, so an
      // interrupted count never leaves a wrong number on screen.
      setDisplay(value);
    };
  }, [value, durationMs, animated]);

  return <Animated.Text style={style}>{format ? format(display) : String(display)}</Animated.Text>;
}
