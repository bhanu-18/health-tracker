import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Sparkline } from './Sparkline';
import { Body, Caption } from './Typography';
import { radius, spacing, type MetricKey, type Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

type Props = {
  label: string;
  /** Formatted value, or null when genuinely unavailable. */
  value: string | null;
  unit?: string;
  metric: MetricKey;
  icon: keyof typeof Ionicons.glyphMap;
  /** Oldest first. Drives the trend line. */
  history?: readonly (number | null)[];
  /** Context line, e.g. "12% above your average". */
  detail?: string;
};

/**
 * One metric: value, trend and context.
 *
 * The trend line and the context line are the substance here. A card showing
 * "9,052 steps" and nothing else answers no question a person actually has --
 * whether that is typical, better than yesterday, heading anywhere. That
 * emptiness is what made the previous dashboard feel unfinished.
 */
export function MetricCard({ label, value, unit, metric, icon, history, detail }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const gradient = theme.metricGradients[metric];
  const hasValue = value != null;

  return (
    <View style={styles.card}>
      {/* The gradient is drawn as SVG rather than with a native gradient
          module, so this needed no rebuild to try. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={`card-${metric}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient[0]} stopOpacity={theme.isDark ? 0.22 : 0.14} />
            <Stop offset="1" stopColor={gradient[1]} stopOpacity={theme.isDark ? 0.08 : 0.04} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#card-${metric})`} rx={radius.lg} />
      </Svg>

      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <LinearGradient id={`badge-${metric}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={gradient[0]} />
                <Stop offset="1" stopColor={gradient[1]} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#badge-${metric})`} rx={999} />
          </Svg>
          <Ionicons name={icon} size={15} color="#FFFFFF" />
        </View>

        {history && history.length > 1 ? <Sparkline values={history} gradient={gradient} /> : null}
      </View>

      <Caption style={styles.label}>{label}</Caption>

      <View style={styles.valueRow}>
        <Body style={styles.value} color={hasValue ? theme.colors.text : theme.colors.textFaint}>
          {hasValue ? value : '--'}
        </Body>
        {hasValue && unit ? <Caption style={styles.unit}>{unit}</Caption> : null}
      </View>

      <Caption style={styles.detail} color={theme.colors.textMuted}>
        {hasValue ? (detail ?? '') : 'No data'}
      </Caption>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.xs,
      overflow: 'hidden',
      backgroundColor: t.colors.surface,
      ...t.shadows.card,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    badge: {
      width: 28,
      height: 28,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    label: { letterSpacing: 0.4 },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
    value: { fontSize: 26, fontWeight: '700' },
    unit: { textTransform: 'none', letterSpacing: 0, fontWeight: '500' },
    detail: {
      textTransform: 'none',
      letterSpacing: 0,
      fontWeight: '400',
      minHeight: 15,
    },
  });
