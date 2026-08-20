import { StyleSheet, View } from 'react-native';
import { Body, Caption } from './Typography';
import { radius, spacing, type Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

export type Stages = {
  deepHours: number;
  coreHours: number;
  remHours: number;
  awakeHours: number;
};

type Props = { stages: Stages };

const formatHours = (hours: number): string => {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (whole === 0) return `${minutes}m`;
  return minutes === 0 ? `${whole}h` : `${whole}h ${minutes}m`;
};

/**
 * How a night broke down.
 *
 * The single hours figure answers "how long", which is the less interesting
 * question -- seven hours of mostly-light sleep is not the same night as seven
 * hours with an hour of deep. The data was already arriving and being thrown
 * away.
 *
 * A stacked bar rather than four numbers, because the proportions are the
 * point and proportions are what a bar shows without arithmetic.
 */
export function SleepStages({ stages }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  const rows = [
    { key: 'deep', label: 'Deep', hours: stages.deepHours, color: theme.metricColors.sleep },
    { key: 'core', label: 'Core', hours: stages.coreHours, color: theme.metricColors.steps },
    { key: 'rem', label: 'REM', hours: stages.remHours, color: theme.metricColors.weight },
    { key: 'awake', label: 'Awake', hours: stages.awakeHours, color: theme.colors.textFaint },
  ].filter((row) => row.hours > 0);

  const total = rows.reduce((sum, row) => sum + row.hours, 0);
  if (total <= 0) return null;

  return (
    <View style={styles.wrap}>
      <Caption style={styles.title}>Sleep stages</Caption>

      <View style={styles.bar}>
        {rows.map((row) => (
          <View
            key={row.key}
            style={{
              // Proportion of the staged time, not of the night: a source that
              // leaves gaps unstaged would otherwise leave a puzzling blank.
              flex: row.hours / total,
              backgroundColor: row.color,
            }}
          />
        ))}
      </View>

      <View style={styles.legend}>
        {rows.map((row) => (
          <View key={row.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: row.color }]} />
            <Caption style={styles.legendLabel} color={theme.colors.textMuted}>
              {row.label}
            </Caption>
            <Body style={styles.legendValue}>{formatHours(row.hours)}</Body>
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      marginBottom: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: t.colors.surface,
      ...t.shadows.card,
    },
    title: { marginBottom: spacing.md },
    bar: {
      flexDirection: 'row',
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
      backgroundColor: t.colors.border,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.lg,
      marginTop: spacing.md,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { textTransform: 'none', letterSpacing: 0 },
    legendValue: { fontSize: 14, fontWeight: '600' },
  });
