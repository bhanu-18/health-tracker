import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';
import type { Theme } from '../theme/tokens';
import { useThemedStyles } from '../theme/useTheme';

type Props = {
  children: ReactNode;
  /** Set false for screens that manage their own scrolling (e.g. a long list). */
  scroll?: boolean;
};

/**
 * Standard screen frame: background colour, horizontal padding, and safe-area
 * handling so content never sits under the notch or the home indicator.
 */
export function Screen({ children, scroll = true }: Props) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + spacing.lg,
    // Clear the tab bar as well as the home indicator.
    paddingBottom: insets.bottom + spacing.xxxl,
  };

  if (!scroll) {
    return <View style={[styles.container, padding]}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, padding]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    content: {
      paddingHorizontal: spacing.xl,
    },
  });
