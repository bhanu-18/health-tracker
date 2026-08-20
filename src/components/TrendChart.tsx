import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { Caption } from './Typography';
import { spacing, type Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

export type TrendPoint = {
  /** X position as a value that increases with time; usually a day index. */
  x: number;
  y: number;
};

type Props = {
  points: readonly TrendPoint[];
  gradient: readonly [string, string];
  height?: number;
  /** Optional horizontal reference line, e.g. a goal weight. */
  goal?: number | null;
  formatValue?: (value: number) => string;
};

/**
 * A line chart with a gradient stroke and a soft fill beneath it.
 *
 * Hand-drawn with react-native-svg rather than a charting library: the
 * requirement is one line and a goal marker, and a library would bring a large
 * dependency plus its own styling opinions to argue with.
 */
export function TrendChart({ points, gradient, height = 200, goal, formatValue }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Caption color={theme.colors.textFaint}>Log at least two days to see a trend</Caption>
      </View>
    );
  }

  const width = 320;
  const padding = { top: 20, right: 10, bottom: 10, left: 10 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  // The goal joins the vertical range, or a goal outside the data would be
  // drawn off the top or bottom of the chart.
  const candidateYs = goal != null ? [...ys, goal] : ys;
  let minY = Math.min(...candidateYs);
  let maxY = Math.max(...candidateYs);

  // A flat series would give a zero range and divide by zero.
  if (maxY - minY < 0.5) {
    minY -= 0.5;
    maxY += 0.5;
  }

  const scaleX = (x: number) =>
    padding.left + (maxX === minX ? plotWidth / 2 : ((x - minX) / (maxX - minX)) * plotWidth);
  // SVG y grows downward, so the axis is inverted here.
  const scaleY = (y: number) =>
    padding.top + plotHeight - ((y - minY) / (maxY - minY)) * plotHeight;

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${scaleX(point.x)} ${scaleY(point.y)}`)
    .join(' ');

  // The same path closed along the bottom, for the fill beneath the line.
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const area = `${line} L ${scaleX(last.x)} ${height - padding.bottom} L ${scaleX(first.x)} ${height - padding.bottom} Z`;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={gradient[0]} />
            <Stop offset="1" stopColor={gradient[1]} />
          </LinearGradient>
          <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            {/* Fades to nothing at the baseline, so the fill reads as depth
                rather than as a solid block competing with the line. */}
            <Stop offset="0" stopColor={gradient[0]} stopOpacity={theme.isDark ? 0.3 : 0.22} />
            <Stop offset="1" stopColor={gradient[1]} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {goal != null ? (
          <Line
            x1={padding.left}
            y1={scaleY(goal)}
            x2={width - padding.right}
            y2={scaleY(goal)}
            stroke={theme.colors.border}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ) : null}

        <Path d={area} fill="url(#trendFill)" />
        <Path
          d={line}
          stroke="url(#trendStroke)"
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Only the latest reading is marked. Dotting every point turns a trend
            line into noise, which is the opposite of what it is for. */}
        <Circle
          cx={scaleX(last.x)}
          cy={scaleY(last.y)}
          r={5}
          fill={gradient[1]}
          stroke={theme.colors.surface}
          strokeWidth={2.5}
        />
      </Svg>

      <View style={styles.axis}>
        <Caption color={theme.colors.textFaint}>
          {formatValue ? formatValue(minY) : minY.toFixed(1)}
        </Caption>
        <Caption color={theme.colors.textFaint}>
          {formatValue ? formatValue(maxY) : maxY.toFixed(1)}
        </Caption>
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
