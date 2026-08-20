import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

type Props = {
  /** The message to show. Null hides the toast. */
  message: string | null;
  onDismiss: () => void;
  tone?: 'success' | 'error';
  /** How long it stays before fading, in milliseconds. */
  durationMs?: number;
};

/**
 * A brief confirmation that something happened.
 *
 * Replaces a line of small green text that sat above the button. That failed
 * three ways: it was too quiet to notice after tapping a control at the bottom
 * of the screen, it never cleared -- so it kept describing a save from minutes
 * ago -- and nothing moved, so there was no moment that drew the eye.
 *
 * Errors get a longer duration than confirmations: a success only needs to be
 * glimpsed, while a failure has to be read and understood.
 */
export function Toast({ message, onDismiss, tone = 'success', durationMs }: Props) {
  const insets = useSafeAreaInsets();
  /**
   * Held in state with a lazy initialiser rather than a ref.
   *
   * The value is created once either way, but reading `ref.current` during
   * render is flagged by react-hooks/refs -- refs are for values the render
   * does not depend on, and these are passed straight into the style below.
   * useState never re-runs the initialiser, so there is no extra allocation.
   */
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(12));

  const visibleFor = durationMs ?? (tone === 'error' ? 5000 : 2500);

  useEffect(() => {
    if (message == null) return;

    // Animated values are refs, not state, so driving them here does not cause
    // a render and does not need the setState-in-effect exception.
    opacity.setValue(0);
    translateY.setValue(12);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        ({ finished }) => {
          // Only clear if the fade actually completed. An interrupted animation
          // means a newer message replaced this one, and dismissing then would
          // wipe a toast the user has not seen.
          if (finished) onDismiss();
        },
      );
    }, visibleFor);

    return () => clearTimeout(timer);
  }, [message, visibleFor, opacity, translateY, onDismiss]);

  if (message == null) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { bottom: insets.bottom + spacing.xxl, opacity, transform: [{ translateY }] },
      ]}
      // Announced to screen readers, which cannot see a brief visual change.
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={[styles.pill, tone === 'error' && styles.pillError]}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
  },
  pill: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  pillError: { backgroundColor: colors.danger },
  text: {
    color: colors.primaryText,
    fontSize: fontSize.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});
