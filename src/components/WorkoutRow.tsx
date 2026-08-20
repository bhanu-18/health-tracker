import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { GradientBadge } from './GradientBadge';
import { Body, Caption } from './Typography';
import type { WorkoutSession } from '../services/health';
import { radius, spacing, type Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

/** Duration in the shape people say it: "45 min", "1h 12m". */
export const formatDuration = (minutes: number): string =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

/** A rough icon per activity. Falls back rather than guessing wrongly. */
function iconFor(activityType: string): keyof typeof Ionicons.glyphMap {
  const name = activityType.toLowerCase();
  if (name.includes('run')) return 'walk';
  if (name.includes('walk') || name.includes('hik')) return 'footsteps';
  if (name.includes('cycl') || name.includes('bik')) return 'bicycle';
  if (name.includes('swim')) return 'water';
  if (name.includes('strength') || name.includes('training')) return 'barbell';
  if (name.includes('yoga') || name.includes('mind')) return 'flower';
  return 'fitness';
}

type Props = {
  workout: WorkoutSession;
  /** Shown when a list spans more than one day. */
  showDate?: boolean;
};

/**
 * One workout session.
 *
 * Shared so the dashboard and history draw them identically -- the two had
 * started to diverge once the dashboard needed its own copy.
 *
 * The source is always shown, and deliberately. Workout sessions are the one
 * thing the OS does not reconcile across sources, so a run recorded by both a
 * watch and a running app appears twice; naming the source is what lets a
 * person recognise a duplicate rather than believe they trained twice.
 */
export function WorkoutRow({ workout, showDate = false }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  const when = showDate
    ? workout.startedAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : workout.startedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.row}>
      <GradientBadge
        icon={iconFor(workout.activityType)}
        gradient={theme.metricGradients.steps}
        id={`workout-${workout.id}`}
        size={26}
      />

      <View style={styles.info}>
        <Body>{workout.activityType}</Body>
        <Caption style={styles.meta} color={theme.colors.textFaint}>
          {`${when} · ${formatDuration(workout.durationMinutes)} · ${workout.sourceName}`}
        </Caption>
      </View>

      {workout.energyKcal != null ? (
        <View style={styles.calorieGroup}>
          <Body style={styles.calories} color={theme.metricColors.food}>
            {workout.energyKcal}
          </Body>
          <Caption style={styles.calorieUnit} color={theme.colors.textFaint}>
            kcal
          </Caption>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      ...t.shadows.card,
    },
    info: { gap: 2, flex: 1 },
    meta: { textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
    calorieGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
    calories: { fontWeight: '700', fontSize: 17 },
    calorieUnit: { textTransform: 'none', letterSpacing: 0, fontWeight: '500' },
  });
