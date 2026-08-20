import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BarChart, type Bar } from '../../src/components/BarChart';
import { GradientBadge } from '../../src/components/GradientBadge';
import { Screen } from '../../src/components/Screen';
import { TrendChart } from '../../src/components/TrendChart';
import { Body, Caption, Heading, Title } from '../../src/components/Typography';
import { today } from '../../src/lib/dates';
import { fromKg } from '../../src/lib/units';
import { meanOf, useHistory, type HistoryRange } from '../../src/hooks/useHistory';
import type { WorkoutSession } from '../../src/services/health';
import { selectStepGoal, selectWeightUnit, useProfile } from '../../src/stores/profile';
import { useSelectedDate } from '../../src/stores/selectedDate';
import { radius, spacing, type MetricKey, type Theme } from '../../src/theme/tokens';
import { useTheme, useThemedStyles } from '../../src/theme/useTheme';

/** "18 Aug" -- short enough for a chart axis. */
const shortLabel = (iso: string): string => {
  const parts = iso.split('-').map(Number);
  const local = new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return local.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const formatDuration = (minutes: number): string =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

/**
 * Screen 4 -- History.
 *
 * Weekly and monthly charts, plus workout sessions.
 */
export default function HistoryScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const setSelectedDate = useSelectedDate((s) => s.setDate);
  const [range, setRange] = useState<HistoryRange>('week');

  /** Open a day on the dashboard, which can now show any date. */
  const openDay = (index: number) => {
    const day = days[index];
    if (!day) return;
    setSelectedDate(day.date);
    router.push('/');
  };

  const date = today();
  const { days, workouts, isLoading } = useHistory(date, range);

  const stepGoal = useProfile(selectStepGoal);
  const weightUnit = useProfile(selectWeightUnit);

  const label = (iso: string) => shortLabel(iso);

  const stepBars: Bar[] = days.map((d) => ({ value: d.steps, label: label(d.date) }));
  const sleepBars: Bar[] = days.map((d) => ({ value: d.sleepHours, label: label(d.date) }));
  const calorieBars: Bar[] = days.map((d) => ({ value: d.caloriesEaten, label: label(d.date) }));

  const weightPoints = useMemo(
    () =>
      days
        .map((d, index) => ({ x: index, y: d.weightKg }))
        .filter((p): p is { x: number; y: number } => p.y != null)
        .map((p) => ({ x: p.x, y: fromKg(p.y, weightUnit) })),
    [days, weightUnit],
  );

  const avgSteps = meanOf(days, (d) => d.steps);
  const avgSleep = meanOf(days, (d) => d.sleepHours);
  const avgCalories = meanOf(days, (d) => d.caloriesEaten);
  const totalWorkoutMinutes = workouts.reduce((sum, w) => sum + w.durationMinutes, 0);

  return (
    <Screen>
      <Heading>History</Heading>

      <View style={styles.rangeRow}>
        {(['week', 'month'] as HistoryRange[]).map((option) => (
          <Pressable
            key={option}
            onPress={() => setRange(option)}
            style={[styles.chip, range === option && styles.chipSelected]}
            accessibilityLabel={option === 'week' ? 'Last 7 days' : 'Last 30 days'}
          >
            <Caption
              style={styles.chipText}
              color={range === option ? theme.colors.primaryText : theme.colors.textMuted}
            >
              {option === 'week' ? '7 days' : '30 days'}
            </Caption>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <Body style={styles.loading} color={theme.colors.textMuted}>
          Loading...
        </Body>
      ) : (
        <>
          <ChartCard
            title="Steps"
            metric="steps"
            icon="footsteps"
            summary={avgSteps != null ? `${Math.round(avgSteps).toLocaleString()} a day` : null}
          >
            <BarChart
              bars={stepBars}
              gradient={theme.metricGradients.steps}
              id="steps"
              onSelect={openDay}
              goal={stepGoal}
              formatValue={(v) => Math.round(v).toLocaleString()}
            />
          </ChartCard>

          <ChartCard
            title="Sleep"
            metric="sleep"
            icon="moon"
            summary={avgSleep != null ? `${avgSleep.toFixed(1)} hrs a night` : null}
          >
            <BarChart
              bars={sleepBars}
              gradient={theme.metricGradients.sleep}
              id="sleep"
              onSelect={openDay}
              formatValue={(v) => `${v.toFixed(1)} hrs`}
            />
          </ChartCard>

          <ChartCard
            title="Calories eaten"
            metric="food"
            icon="restaurant"
            summary={
              avgCalories != null ? `${Math.round(avgCalories).toLocaleString()} a day` : null
            }
          >
            <BarChart
              bars={calorieBars}
              gradient={theme.metricGradients.food}
              id="calories"
              onSelect={openDay}
              formatValue={(v) => Math.round(v).toLocaleString()}
            />
          </ChartCard>

          <ChartCard
            title="Weight"
            metric="weight"
            icon="trending-down"
            summary={
              weightPoints.length > 0
                ? `${weightPoints[weightPoints.length - 1]!.y.toFixed(1)} ${weightUnit}`
                : null
            }
          >
            <TrendChart
              points={weightPoints}
              gradient={theme.metricGradients.weight}
              height={160}
              formatValue={(v) => v.toFixed(1)}
            />
          </ChartCard>

          <View style={styles.workoutSection}>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Workouts</Title>
              {workouts.length > 0 ? (
                <Caption color={theme.colors.textFaint}>
                  {`${workouts.length} · ${formatDuration(totalWorkoutMinutes)}`}
                </Caption>
              ) : null}
            </View>

            {workouts.length === 0 ? (
              <Body color={theme.colors.textMuted}>No workouts recorded in this range.</Body>
            ) : (
              <>
                {workouts.map((workout) => (
                  <WorkoutRow key={workout.id} workout={workout} />
                ))}

                {/* Stated rather than hidden. The OS merges cumulative metrics
                    across sources but does not merge workout sessions, so a run
                    recorded by a watch and a running app appears twice. Listing
                    them keeps that visible instead of folding it into a total
                    that would be silently wrong. */}
                <Body style={styles.note} color={theme.colors.textFaint}>
                  Sessions are listed individually, not added up. Two devices recording the same
                  workout will each appear, so you can see it rather than have it double-counted.
                </Body>
              </>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

function ChartCard({
  title,
  metric,
  icon,
  summary,
  children,
}: {
  title: string;
  metric: MetricKey;
  icon: Parameters<typeof GradientBadge>[0]['icon'];
  summary: string | null;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <GradientBadge
          icon={icon}
          gradient={theme.metricGradients[metric]}
          id={`history-${metric}`}
          size={26}
        />
        <View style={styles.cardTitles}>
          <Caption>{title}</Caption>
          {summary ? (
            <Body style={styles.summary} color={theme.metricColors[metric]}>
              {summary}
            </Body>
          ) : (
            <Body style={styles.summary} color={theme.colors.textFaint}>
              No data
            </Body>
          )}
        </View>
      </View>
      {children}
    </View>
  );
}

function WorkoutRow({ workout }: { workout: WorkoutSession }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.workoutRow}>
      <View style={styles.workoutInfo}>
        <Body>{workout.activityType}</Body>
        <Caption style={styles.workoutMeta} color={theme.colors.textFaint}>
          {`${formatDuration(workout.durationMinutes)} · ${workout.sourceName}`}
        </Caption>
      </View>
      {workout.energyKcal != null ? (
        <View style={styles.calorieGroup}>
          <Body style={styles.workoutCalories} color={theme.metricColors.food}>
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
    rangeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: t.colors.surface,
      ...t.shadows.card,
    },
    chipSelected: { backgroundColor: t.colors.primary },
    chipText: { textTransform: 'none', letterSpacing: 0 },
    loading: { marginTop: spacing.xxl },
    card: {
      marginTop: spacing.xl,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: t.colors.surface,
      ...t.shadows.card,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    cardTitles: { gap: 2 },
    summary: { fontWeight: '700', fontSize: 17 },
    workoutSection: { marginTop: spacing.xxl },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    sectionTitle: { fontSize: 18 },
    workoutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      ...t.shadows.card,
    },
    workoutInfo: { gap: 2, flex: 1 },
    workoutMeta: { textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
    calorieGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
    workoutCalories: { fontWeight: '700', fontSize: 17 },
    calorieUnit: { textTransform: 'none', letterSpacing: 0, fontWeight: '500' },
    note: { fontSize: 13, marginTop: spacing.md },
  });
