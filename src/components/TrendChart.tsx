import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Caption } from './Typography';
import { colors, spacing } from '../theme/tokens';

export type TrendPoint = {
  /** X position as a value that increases with time; usually a day index. */
  x: number;
  y: number;
};

type Props = {
  points: readonly TrendPoint[];
  color: string;
  height?: number;
  /** Optional horizontal reference line, e.g. a goal weight. */
  goal?: number | null;
  formatValue?: (value: number) => string;
};

/**
 * A minimal line chart.
 *
 * Hand-drawn with react-native-svg rather than pulling in a charting library:
 * the requirement is one line and an optional goal marker, and a chart library
 * would add a large dependency plus its own styling opinions to fight.
 */
export function TrendChart({ points, color, height = 180, goal, formatValue }: Props) {
  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Caption color={colors.textFaint}>Log at least two days to see a trend</Caption>
      </View>
    );
  }

  const width = 320;
  const padding = { top: 16, right: 8, bottom: 8, left: 8 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  // Include the goal in the vertical range, or a goal outside the data would be
  // drawn off the top or bottom of the chart.
  const candidateYs = goal != null ? [...ys, goal] : ys;
  let minY = Math.min(...candidateYs);
  let maxY = Math.max(...candidateYs);

  // A flat series would give a zero range and divide by zero, so pad it out.
  if (maxY - minY < 0.5) {
    minY -= 0.5;
    maxY += 0.5;
  }

  const scaleX = (x: number) =>
    padding.left + (maxX === minX ? plotWidth / 2 : ((x - minX) / (maxX - minX)) * plotWidth);
  // SVG y grows downward, so the axis is inverted here.
  const scaleY = (y: number) =>
    padding.top + plotHeight - ((y - minY) / (maxY - minY)) * plotHeight;

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${scaleX(point.x)} ${scaleY(point.y)}`)
    .join(' ');

  const last = points[points.length - 1]!;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {goal != null ? (
          <Line
            x1={padding.left}
            y1={scaleY(goal)}
            x2={width - padding.right}
            y2={scaleY(goal)}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ) : null}

        <Path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />

        {/* Only the latest point is marked. Dotting every reading turns a trend
            line into noise, which is the opposite of what it is for. */}
        <Circle cx={scaleX(last.x)} cy={scaleY(last.y)} r={4} fill={color} />
      </Svg>

      <View style={styles.axis}>
        <Caption color={colors.textFaint}>
          {formatValue ? formatValue(minY) : minY.toFixed(1)}
        </Caption>
        <Caption color={colors.textFaint}>
          {formatValue ? formatValue(maxY) : maxY.toFixed(1)}
        </Caption>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
});
