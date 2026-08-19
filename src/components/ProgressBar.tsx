import { StyleSheet, View } from 'react-native';
import { radius } from '../theme/tokens';

type Props = {
  /** 0..1. Values outside that range are clamped rather than overflowing. */
  progress: number;
  color: string;
  trackColor: string;
  height?: number;
};

/** A flat progress bar. No gradient, no shadow -- just two rectangles. */
export function ProgressBar({ progress, color, trackColor, height = 8 }: Props) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return (
    <View
      style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: radius.pill,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});
