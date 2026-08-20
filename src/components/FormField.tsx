import { StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Caption } from './Typography';
import { fontSize, radius, spacing } from '../theme/tokens';
import type { Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  /** Suffix shown inside the field, e.g. a unit. */
  suffix?: string;
  autoFocus?: boolean;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  suffix,
  autoFocus,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <Caption>{label}</Caption>
      <View style={styles.field}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          // Recipe and ingredient names are lowercase in the search index, and
          // autocorrect fights dish names constantly.
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel={label}
        />
        {suffix ? (
          <Caption style={styles.suffix} color={colors.textMuted}>
            {suffix}
          </Caption>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: { gap: spacing.sm },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    input: {
      flex: 1,
      fontSize: fontSize.body,
      color: t.colors.text,
      padding: 0,
      minHeight: 24,
    },
    suffix: { textTransform: 'none', letterSpacing: 0 },
  });
