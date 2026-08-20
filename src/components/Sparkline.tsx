import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = {
  /** Oldest first. Nulls are days with no data and break the line. */
  values: readonly (number | null)[];
  gradient: readonly [string, string];
  width?: number;
  height?: number;
};

/**
 * A tiny trend line for a metric card.
 *
 * The point is context rather than precision: "9,052 steps" alone answers
 * nothing about whether today is typical, which is the specific reason the
 * dashboard felt sparse. No axes or labels -- at this size they would be
 * unreadable, and the number beside it carries the exact value.
 *
 * Missing days break the line rather than being interpolated. A smooth line
 * through a day you did not wear the watch is a claim about data that does not
 * exist.
 */
export function Sparkline({ values, gradient, width = 72, height = 24 }: Props) {
  const present = values.filter((v): v is number => v != null);
  if (present.length < 2) return <View style={{ width, height }} />;

  const min = Math.min(...present);
  const max = Math.max(...present);
  const span = max - min || 1;

  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  // A little vertical padding so the stroke is not clipped at the extremes.
  const pad = 2;
  const plotHeight = height - pad * 2;

  const segments: string[] = [];
  let drawing = false;

  values.forEach((value, index) => {
    if (value == null) {
      drawing = false;
      return;
    }
    const x = index * stepX;
    const y = pad + plotHeight - ((value - min) / span) * plotHeight;
    segments.push(`${drawing ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    drawing = true;
  });

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sparkGradient" x1="0" y1="0" x2="1" y2="0">
          {/* Fading in from the left reads as "older, less relevant". */}
          <Stop offset="0" stopColor={gradient[0]} stopOpacity="0.35" />
          <Stop offset="1" stopColor={gradient[1]} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Path
        d={segments.join(' ')}
        stroke="url(#sparkGradient)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
