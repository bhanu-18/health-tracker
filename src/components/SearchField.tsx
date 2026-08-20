import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { fontSize, radius, spacing } from '../theme/tokens';
import type { Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SearchField({ value, onChangeText, placeholder = 'Search foods' }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={18} color={colors.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        // Food names are proper nouns to the user but stored lowercase for
        // search, so autocorrect fighting "idli" or "poha" is pure friction.
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={colors.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
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
      // Without an explicit height the field jumps as text is entered on Android.
      minHeight: 22,
      padding: 0,
    },
  });
