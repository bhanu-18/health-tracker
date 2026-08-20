import { StyleSheet, View } from 'react-native';
import { Caption, Title } from './Typography';
import { radius, spacing, type MetricKey, type Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

type Props = {
  label: string;
  /**
   * The formatted value, or null when the metric is genuinely unavailable.
   * Passing null renders an explicit empty state rather than a misleading "0".
   */
  value: string | null;
  unit?: string;
  metric: MetricKey;
  /** Optional secondary line, e.g. "goal 10,000". */
  detail?: string;
};

/**
 * One metric, colour-coded by type. Steps are always teal, sleep always purple --
 * the colour is how the user identifies the metric before reading the label.
 */
export function StatCard({ label, value, unit, metric, detail }: Props) {
  const { colors, metricColors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const accent = metricColors[metric];
  const hasValue = value != null;

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Caption color={colors.textMuted}>{label}</Caption>

      <View style={styles.valueRow}>
        <Title style={styles.value} color={hasValue ? colors.text : colors.textFaint}>
          {hasValue ? value : '--'}
        </Title>
        {hasValue && unit ? <Caption style={styles.unit}>{unit}</Caption> : null}
      </View>

      <Caption style={styles.detail} color={colors.textFaint}>
        {hasValue ? (detail ?? '') : 'No data'}
      </Caption>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.colors.border,
      padding: spacing.lg,
      gap: spacing.xs,
      overflow: 'hidden',
    },
    // A 3pt colour rail along the top edge, instead of tinting the whole card.
    accent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
    },
    value: {
      fontSize: 24,
    },
    unit: {
      textTransform: 'none',
      letterSpacing: 0,
      fontWeight: '500',
    },
    detail: {
      textTransform: 'none',
      letterSpacing: 0,
      fontWeight: '400',
      minHeight: 14,
    },
  });
