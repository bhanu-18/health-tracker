import { StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Caption } from './Typography';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

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

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text,
    padding: 0,
    minHeight: 24,
  },
  suffix: { textTransform: 'none', letterSpacing: 0 },
});
