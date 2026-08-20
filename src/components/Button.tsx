import { Pressable, StyleSheet, Text } from 'react-native';
import { fontSize, radius, spacing } from '../theme/tokens';
import type { Theme } from '../theme/tokens';
import { useThemedStyles } from '../theme/useTheme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

/** Solid dark primary action button, per the design direction. Flat, no shadow. */
export function Button({ label, onPress, variant = 'primary' }: Props) {
  const styles = useThemedStyles(makeStyles);
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // Feedback comes from opacity alone -- no scale animation, no shadow.
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: t.colors.primary,
    },
    secondary: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    pressed: {
      opacity: 0.75,
    },
    label: {
      fontSize: fontSize.body,
      fontWeight: '600',
    },
    primaryLabel: {
      color: t.colors.primaryText,
    },
    secondaryLabel: {
      color: t.colors.text,
    },
  });
