import { StyleSheet, View } from 'react-native';
import { Body, Caption, Heading } from './Typography';
import { colors, radius, spacing } from '../theme/tokens';

type Props = {
  title: string;
  summary: string;
  /** The concrete pieces still to build, shown so the stub is never mistaken for the finished screen. */
  todo: string[];
};

/** An explicit placeholder. Better than an empty screen that looks broken. */
export function ComingSoon({ title, summary, todo }: Props) {
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

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  summary: { marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  list: { gap: spacing.sm },
  item: { fontSize: 15 },
});
