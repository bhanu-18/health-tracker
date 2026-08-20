import { StyleSheet, View } from 'react-native';
import { Body, Caption, Heading } from './Typography';
import { radius, spacing } from '../theme/tokens';
import type { Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

type Props = {
  title: string;
  summary: string;
  /** The concrete pieces still to build, shown so the stub is never mistaken for the finished screen. */
  todo: string[];
};

/** An explicit placeholder. Better than an empty screen that looks broken. */
export function ComingSoon({ title, summary, todo }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <Heading>{title}</Heading>
      <Body style={styles.summary} color={colors.textMuted}>
        {summary}
      </Body>

      <View style={styles.card}>
        <Caption>Still to build</Caption>
        <View style={styles.list}>
          {todo.map((item) => (
            <Body key={item} style={styles.item} color={colors.textMuted}>
              {`•  ${item}`}
            </Body>
          ))}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: { gap: spacing.sm },
    summary: { marginBottom: spacing.lg },
    card: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.md,
    },
    list: { gap: spacing.sm },
    item: { fontSize: 15 },
  });
