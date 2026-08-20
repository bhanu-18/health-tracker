import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Caption } from './Typography';
import { spacing, type Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

export type Bar = {
  /** Null is a day with no data, drawn as an empty slot rather than a zero. */
  value: number | null;
  label?: string;
};

type Props = {
  bars: readonly Bar[];
  gradient: readonly [string, string];
  /** Must be unique on screen: SVG gradient ids are document-global. */
  id: string;
  height?: number;
  /** Dashed reference line, e.g. a daily goal. */
  goal?: number | null;
  formatValue?: (value: number) => string;
};

/**
 * Daily totals as bars.
 *
 * Bars rather than a line because these are discrete daily amounts, not a
 * continuous quantity: a line between Monday and Tuesday implies values in
 * between, and there are none. Weight uses a line for exactly the opposite
 * reason -- it changes continuously and is merely sampled.
 *
 * A day with no data is an empty slot, never a zero-height bar. Drawing zero
 * would claim you took no steps on a day the watch was simply not worn.
 */
export function BarChart({ bars, gradient, id, height = 160, goal, formatValue }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  const present = bars.map((b) => b.value).filter((v): v is number => v != null);
  if (present.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Caption color={theme.colors.textFaint}>No data for this range</Caption>
      </View>
    );
  }

  const width = 320;
  const padding = { top: 12, bottom: 4 };
  const plotHeight = height - padding.top - padding.bottom;

  // Scaled from zero, not from the minimum. Starting at the minimum would
  // exaggerate small differences into dramatic-looking swings.
  const max = Math.max(...present, goal ?? 0);
  const scale = (value: number) => (max > 0 ? (value / max) * plotHeight : 0);

  const slot = width / bars.length;
  // A gap between bars, but never so wide that a long range disappears.
  const barWidth = Math.max(2, Math.min(slot * 0.62, 26));

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={`bars-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={gradient[0]} />
            <Stop offset="1" stopColor={gradient[1]} stopOpacity="0.55" />
          </LinearGradient>
        </Defs>

        {goal != null && goal > 0 ? (
          <Line
            x1={0}
            y1={padding.top + plotHeight - scale(goal)}
            x2={width}
            y2={padding.top + plotHeight - scale(goal)}
            stroke={theme.colors.textFaint}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ) : null}

        {bars.map((bar, index) => {
          if (bar.value == null) return null;
          const barHeight = Math.max(scale(bar.value), 2);
          return (
            <Rect
              key={index}
              x={index * slot + (slot - barWidth) / 2}
              y={padding.top + plotHeight - barHeight}
              width={barWidth}
              height={barHeight}
              rx={Math.min(barWidth / 2, 4)}
              fill={`url(#bars-${id})`}
            />
          );
        })}
      </Svg>

      <View style={styles.axis}>
        <Caption color={theme.colors.textFaint}>{bars[0]?.label ?? ''}</Caption>
        <Caption color={theme.colors.textFaint}>
          {formatValue ? `peak ${formatValue(max)}` : ''}
        </Caption>
        <Caption color={theme.colors.textFaint}>{bars[bars.length - 1]?.label ?? ''}</Caption>
      </View>
    </View>
  );
}

const makeStyles = (_t: Theme) =>
  StyleSheet.create({
    empty: { alignItems: 'center', justifyContent: 'center' },
    axis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
  });
