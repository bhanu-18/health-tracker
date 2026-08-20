import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AnimatedNumber } from '../../src/components/AnimatedNumber';
import { Button } from '../../src/components/Button';
import { EditMealSheet } from '../../src/components/EditMealSheet';
import { SwipeToDelete } from '../../src/components/SwipeToDelete';
import { Toast } from '../../src/components/Toast';
import { MetricCard } from '../../src/components/MetricCard';
import { SleepStages } from '../../src/components/SleepStages';
import { WorkoutRow } from '../../src/components/WorkoutRow';
import { ProgressRing } from '../../src/components/ProgressRing';
import { Screen } from '../../src/components/Screen';
import { Body, Caption, Heading, Title } from '../../src/components/Typography';
import { getRecentWeightEntries } from '../../src/db/repositories/weight';
import type { FoodLogEntry, WeightEntryRow } from '../../src/db/schema';
import { useDailyHealth } from '../../src/hooks/useDailyHealth';
import { averageOf, useWeeklyHealth } from '../../src/hooks/useWeeklyHealth';
import { useDayWorkouts } from '../../src/hooks/useDayWorkouts';
import { useRefreshOnForeground } from '../../src/hooks/useRefreshOnForeground';
import { addDays, formatLongDate, greetingFor, today } from '../../src/lib/dates';
import { describeFreshness, isStale } from '../../src/lib/freshness';
import { calculateEnergyBalance } from '../../src/lib/nutrition';
import { formatWeightDelta, fromKg } from '../../src/lib/units';
import { calculateWeightTrend } from '../../src/lib/weight';
import { isUsingMockHealthData } from '../../src/services/health';
import { totalsFor, useFoodLog } from '../../src/stores/foodLog';
import { useSelectedDate } from '../../src/stores/selectedDate';
import {
  selectCalorieTarget,
  selectStepGoal,
  selectWeightUnit,
  useProfile,
} from '../../src/stores/profile';
import { radius, spacing, type Theme } from '../../src/theme/tokens';
import { useTheme, useThemedStyles } from '../../src/theme/useTheme';

/**
 * Comparison against a personal baseline.
 *
 * "9,052 steps" answers nothing on its own; "12% above your average" is the
 * sentence a person actually wants. Compared against the days before today,
 * since today is usually partial and would drag its own average toward itself.
 */
function comparedToAverage(value: number | null, average: number | null): string | undefined {
  if (value == null || average == null || average <= 0) return undefined;

  const percent = Math.round(((value - average) / average) * 100);
  if (Math.abs(percent) < 5) return 'about your average';
  return `${Math.abs(percent)}% ${percent > 0 ? 'above' : 'below'} your average`;
}

/**
 * Screen 1 -- Today.
 *
 * One dominant figure, then supporting metrics that each carry a trend and a
 * comparison. The previous version showed four bare numbers and a list, which
 * read as unfinished not because it was too plain but because it was too empty:
 * nothing on it answered "is that good?".
 */
export default function TodayScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const date = useSelectedDate((s) => s.date);
  const setDate = useSelectedDate((s) => s.setDate);

  const isToday = date === today();
  const goBack = () => setDate(addDays(date, -1));
  // Forward stops at today: there is nothing to show for tomorrow, and letting
  // someone walk into empty future days looks like the app has lost its data.
  const goForward = () => {
    if (!isToday) setDate(addDays(date, 1));
  };

  const { metrics, isLoading, refresh: refreshToday } = useDailyHealth(date);
  const { days, refresh: refreshWeek } = useWeeklyHealth(date);
  const { workouts, refresh: refreshWorkouts } = useDayWorkouts(date);

  const calorieTarget = useProfile(selectCalorieTarget);
  const stepGoal = useProfile(selectStepGoal);
  const weightUnit = useProfile(selectWeightUnit);

  const entries = useFoodLog((s) => s.entries);
  const loadForDate = useFoodLog((s) => s.loadForDate);
  const removeEntry = useFoodLog((s) => s.removeEntry);
  const setServings = useFoodLog((s) => s.setServings);

  const [editing, setEditing] = useState<FoodLogEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const totals = useMemo(() => totalsFor(entries), [entries]);

  useEffect(() => {
    void loadForDate(date);
  }, [loadForDate, date]);

  const [weightRows, setWeightRows] = useState<WeightEntryRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void getRecentWeightEntries(30).then((rows) => {
      if (!cancelled) setWeightRows(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Re-read everything the screen shows.
   *
   * Health metrics, the food log and weight all come from different places and
   * can each change while the app is backgrounded, so a refresh has to cover
   * all three rather than only the headline figures.
   */
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      refreshToday();
      refreshWeek();
      refreshWorkouts();
      await loadForDate(date);
      setWeightRows(await getRecentWeightEntries(30));
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshToday, refreshWeek, refreshWorkouts, loadForDate, date]);

  useRefreshOnForeground(() => void refreshAll());

  const weightTrend = useMemo(
    () =>
      calculateWeightTrend(
        weightRows.map((row) => ({ id: row.id, kg: row.kg, date: row.date })),
        date,
      ),
    [weightRows, date],
  );

  /**
   * Recomputed on each render rather than on a timer: the screen already
   * re-renders on refresh and on foreground, which is exactly when this can
   * have changed. A ticking clock would repaint the dashboard every minute for
   * a line nobody is watching.
   */
  const recordedAt = metrics?.lastRecordedAt ?? null;
  const freshness = describeFreshness(recordedAt, new Date());
  const freshnessIsStale = isStale(recordedAt, new Date());

  const balance = calculateEnergyBalance({
    target: calorieTarget,
    consumed: totals.calories,
    activeBurned: metrics?.activeEnergyKcal,
  });

  const stepHistory = days.map((d) => d.steps);
  const sleepHistory = days.map((d) => d.sleepHours);
  const energyHistory = days.map((d) => d.activeEnergyKcal);
  const weightHistory = weightRows.slice(-7).map((row) => fromKg(row.kg, weightUnit));

  return (
    <Screen onRefresh={() => void refreshAll()} isRefreshing={isRefreshing}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Caption>{formatLongDate(date)}</Caption>
          <Heading style={styles.greeting}>{isToday ? greetingFor() : 'That day'}</Heading>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={goBack} hitSlop={8} accessibilityLabel="Previous day">
            <Ionicons name="chevron-back" size={22} color={theme.colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={goForward}
            hitSlop={8}
            disabled={isToday}
            accessibilityLabel="Next day"
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isToday ? theme.colors.border : theme.colors.textMuted}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={10}
            accessibilityLabel="Settings"
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={20} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* Says how old the health figures are.
          Data reaches this app through a chain it cannot see, and a total gives
          no hint of its own age. Stated plainly, a long delay reads as
          "force a sync" rather than "this app is broken". */}
      {freshness ? (
        <View style={styles.freshnessRow}>
          <Ionicons
            name={freshnessIsStale ? 'time-outline' : 'checkmark-circle-outline'}
            size={13}
            color={freshnessIsStale ? theme.metricColors.weight : theme.colors.textFaint}
          />
          <Caption
            style={styles.freshnessText}
            color={freshnessIsStale ? theme.metricColors.weight : theme.colors.textFaint}
          >
            {freshnessIsStale
              ? `Health data last synced ${freshness} · pull to refresh`
              : `Health data synced ${freshness}`}
          </Caption>
        </View>
      ) : null}

      {isUsingMockHealthData() ? (
        <View style={styles.notice}>
          <Body style={styles.noticeText}>
            Showing sample health data. Real steps, sleep and calories need a development build.
          </Body>
        </View>
      ) : null}

      {/* The hero. A ring rather than a bar because a proportion of a daily
          budget is naturally circular, and it gives the number somewhere to
          live rather than floating above a line. */}
      <View style={styles.hero}>
        {/* The arc shows what is LEFT, not what has been eaten -- matching the
            label beneath the number. Filling as you ate meant an untouched day
            rendered as an empty ring, which reads as a failed load rather than
            a full budget. Over budget fills completely in the danger colour,
            since an empty ring would again say nothing. */}
        <ProgressRing
          progress={balance.isOverBudget ? 1 : 1 - balance.progress}
          gradient={
            balance.isOverBudget
              ? [theme.colors.danger, theme.colors.danger]
              : theme.metricGradients.food
          }
          trackColor={theme.metricTints.food}
          size={224}
          strokeWidth={18}
        >
          <View style={styles.heroInner}>
            <AnimatedNumber
              value={Math.abs(balance.remaining)}
              format={(v) => v.toLocaleString()}
              style={[
                styles.heroNumber,
                { color: balance.isOverBudget ? theme.colors.danger : theme.colors.text },
              ]}
            />
            <Caption style={styles.heroLabel}>
              {balance.isOverBudget ? 'over budget' : 'kcal left'}
            </Caption>
          </View>
        </ProgressRing>

        <View style={styles.heroLegend}>
          <Body color={theme.colors.textMuted}>{`${totals.calories.toLocaleString()} eaten`}</Body>
          <Body color={theme.colors.textMuted}>
            {balance.usedActiveBurn
              ? `${metrics?.activeEnergyKcal?.toLocaleString()} burned`
              : `of ${calorieTarget.toLocaleString()}`}
          </Body>
        </View>
      </View>

      <View style={styles.statRow}>
        <MetricCard
          label="Steps"
          metric="steps"
          icon="footsteps"
          value={isLoading ? null : (metrics?.steps?.toLocaleString() ?? null)}
          history={stepHistory}
          detail={
            comparedToAverage(
              metrics?.steps ?? null,
              averageOf(days, (d) => d.steps, { excludeLast: true }),
            ) ?? `goal ${stepGoal.toLocaleString()}`
          }
        />
        <MetricCard
          label="Sleep"
          metric="sleep"
          icon="moon"
          value={isLoading ? null : (metrics?.sleepHours?.toString() ?? null)}
          unit="hrs"
          history={sleepHistory}
          detail={
            comparedToAverage(
              metrics?.sleepHours ?? null,
              averageOf(days, (d) => d.sleepHours, { excludeLast: true }),
            ) ?? 'last night'
          }
        />
      </View>

      <View style={styles.statRow}>
        <MetricCard
          label="Active burn"
          metric="food"
          icon="flame"
          value={isLoading ? null : (metrics?.activeEnergyKcal?.toLocaleString() ?? null)}
          unit="kcal"
          history={energyHistory}
          detail={
            comparedToAverage(
              metrics?.activeEnergyKcal ?? null,
              averageOf(days, (d) => d.activeEnergyKcal, { excludeLast: true }),
            ) ?? 'today'
          }
        />
        <MetricCard
          label="Weight"
          metric="weight"
          icon="trending-down"
          value={
            weightTrend.latestKg == null
              ? null
              : fromKg(weightTrend.latestKg, weightUnit).toFixed(1)
          }
          unit={weightUnit}
          history={weightHistory}
          detail={formatWeightDelta(weightTrend.deltaKg, weightUnit)}
        />
      </View>

      {metrics?.sleepStages ? <SleepStages stages={metrics.sleepStages} /> : null}

      {metrics?.restingHeartRate != null ? (
        <View style={styles.statRow}>
          <MetricCard
            label="Resting heart rate"
            metric="sleep"
            icon="heart"
            value={String(metrics.restingHeartRate)}
            unit="bpm"
            history={days.map((d) => d.restingHeartRate)}
            detail={
              comparedToAverage(
                metrics.restingHeartRate,
                averageOf(days, (d) => d.restingHeartRate, { excludeLast: true }),
              ) ?? 'today'
            }
          />
        </View>
      ) : null}

      {workouts.length > 0 ? (
        <View style={styles.workoutSection}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Workouts</Title>
            <Caption color={theme.colors.textFaint}>
              {`${workouts.length} session${workouts.length === 1 ? '' : 's'}`}
            </Caption>
          </View>

          {workouts.map((workout) => (
            <WorkoutRow key={workout.id} workout={workout} />
          ))}

          {/* Stated because the number invites the obvious mistake. HealthKit's
              active energy already includes what these sessions burned, so
              these calories are a description of the day, not an addition to
              the budget above. */}
          <Body style={styles.workoutNote} color={theme.colors.textFaint}>
            Already counted in active burn above, not added on top.
          </Body>
        </View>
      ) : null}

      <View style={styles.mealsSection}>
        <View style={styles.sectionHeader}>
          <Title style={styles.sectionTitle}>Today&apos;s meals</Title>
          {entries.length > 0 ? (
            <Caption color={theme.colors.textFaint}>{`${entries.length} logged`}</Caption>
          ) : null}
        </View>

        {entries.length === 0 ? (
          <Body color={theme.colors.textMuted}>Nothing logged yet.</Body>
        ) : (
          <View style={styles.mealList}>
            {entries.map((entry) => (
              <SwipeToDelete
                key={entry.id}
                label={`${entry.name}, ${entry.calories} kcal`}
                onDelete={() => {
                  void removeEntry(entry.id);
                  setToast(`Removed ${entry.name}`);
                }}
              >
                {/* Tap to correct a portion, swipe to remove. The log was
                    append-only until now: one mistap was permanent. */}
                <Pressable onPress={() => setEditing(entry)} style={styles.mealRow}>
                  <View style={styles.mealInfo}>
                    <Body>{entry.name}</Body>
                    <Caption style={styles.mealMeta}>
                      {entry.slot}
                      {entry.servings !== 1 ? ` · ${entry.servings} servings` : ''}
                    </Caption>
                  </View>
                  <Body style={styles.mealCalories} color={theme.metricColors.food}>
                    {`${entry.calories}`}
                  </Body>
                </Pressable>
              </SwipeToDelete>
            ))}
          </View>
        )}
      </View>

      <Button label="Log a meal" onPress={() => router.push('/food')} />

      <EditMealSheet
        entry={editing}
        onCancel={() => setEditing(null)}
        onSave={(servings) => {
          if (editing) void setServings(editing.id, servings);
          setEditing(null);
          setToast('Portion updated');
        }}
        onDelete={() => {
          if (editing) {
            void removeEntry(editing.id);
            setToast(`Removed ${editing.name}`);
          }
          setEditing(null);
        }}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </Screen>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    greeting: { marginTop: spacing.xs },
    headerLeft: { flex: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    freshnessRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    freshnessText: { textTransform: 'none', letterSpacing: 0, fontWeight: '500' },
    settingsButton: { padding: spacing.xs },
    notice: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: t.metricTints.weight,
    },
    noticeText: { fontSize: 13, color: t.colors.text },
    hero: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
    heroInner: { alignItems: 'center' },
    heroNumber: {
      fontFamily: t.fonts.display,
      fontSize: 56,
      lineHeight: 62,
      letterSpacing: -1.5,
    },
    heroLabel: { marginTop: spacing.xs },
    heroLegend: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignSelf: 'stretch',
      marginTop: spacing.xl,
    },
    statRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    workoutSection: { marginTop: spacing.lg },
    workoutNote: { fontSize: 13, marginTop: spacing.xs, marginBottom: spacing.sm },
    mealsSection: { marginTop: spacing.lg, marginBottom: spacing.xl },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    sectionTitle: { fontSize: 20 },
    mealList: { gap: spacing.sm },
    mealRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      ...t.shadows.card,
    },
    mealInfo: { gap: 2 },
    mealMeta: { textTransform: 'capitalize', letterSpacing: 0, fontWeight: '400' },
    mealCalories: { fontWeight: '700', fontSize: 17 },
  });
