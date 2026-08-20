import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Sparkline } from './Sparkline';
import { Body, Caption } from './Typography';
import { radius, spacing, type MetricKey, type Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

const BADGE_SIZE = 28;

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

  /**
   * Measured rather than sized with percentages.
   *
   * react-native-svg does not resolve a percentage width against a flex parent
   * reliably: the gradient rendered at some default size and stopped partway
   * across the card, leaving a hard vertical seam with plain background beyond
   * it. Explicit pixels are the only dependable way to fill the card.
   */
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current?.width === width && current?.height === height ? current : { width, height },
    );
  };

  return (
    <View style={styles.card} onLayout={onLayout}>
      {/* Drawn as SVG rather than with a native gradient module, so this needed
          no rebuild to try. Rendered only once the card has been measured. */}
      {size ? (
        <Svg style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id={`card-${metric}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} stopOpacity={theme.isDark ? 0.22 : 0.14} />
              <Stop offset="1" stopColor={gradient[1]} stopOpacity={theme.isDark ? 0.08 : 0.04} />
            </LinearGradient>
          </Defs>
          <Rect
            width={size.width}
            height={size.height}
            fill={`url(#card-${metric})`}
            rx={radius.lg}
          />
        </Svg>
      ) : null}

      <View style={styles.headerRow}>
        <View style={styles.badge}>
          {/* Fixed size, so no measurement needed. */}
          <Svg style={StyleSheet.absoluteFill} width={BADGE_SIZE} height={BADGE_SIZE}>
            <Defs>
              <LinearGradient id={`badge-${metric}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={gradient[0]} />
                <Stop offset="1" stopColor={gradient[1]} />
              </LinearGradient>
            </Defs>
            <Rect
              width={BADGE_SIZE}
              height={BADGE_SIZE}
              fill={`url(#badge-${metric})`}
              rx={BADGE_SIZE / 2}
            />
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
      width: BADGE_SIZE,
      height: BADGE_SIZE,
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
