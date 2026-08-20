import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Screen } from '../../src/components/Screen';
import { StatCard } from '../../src/components/StatCard';
import { Body, Caption, Display, Heading, Title } from '../../src/components/Typography';
import { useDailyHealth } from '../../src/hooks/useDailyHealth';
import { formatLongDate, greetingFor, today } from '../../src/lib/dates';
import { calculateEnergyBalance } from '../../src/lib/nutrition';
import { isUsingMockHealthData } from '../../src/services/health';
import { totalsFor, useFoodLog } from '../../src/stores/foodLog';
import {
  selectCalorieTarget,
  selectStepGoal,
  selectWeightUnit,
  useProfile,
} from '../../src/stores/profile';
import { getRecentWeightEntries } from '../../src/db/repositories/weight';
import { calculateWeightTrend } from '../../src/lib/weight';
import { formatWeightDelta, fromKg } from '../../src/lib/units';
import type { WeightEntryRow } from '../../src/db/schema';
import { radius, spacing } from '../../src/theme/tokens';
import type { Theme } from '../../src/theme/tokens';
import { useTheme, useThemedStyles } from '../../src/theme/useTheme';

/**
 * Screen 1 -- Today.
 *
 * One dominant hero metric (calories remaining), then supporting stats. The
 * layout is deliberately not an equal-weight grid: the number you act on is
 * many times larger than the numbers you merely glance at.
 */
export default function TodayScreen() {
  const { colors, metricColors, metricTints } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const date = today();

  const { metrics, isLoading } = useDailyHealth(date);
  const calorieTarget = useProfile(selectCalorieTarget);
  const stepGoal = useProfile(selectStepGoal);
  // Select the raw array, then derive. A selector must return a stable
  // reference: Zustand compares results with Object.is, so a selector that
  // filters or reduces builds a new object every call, which reads as "changed"
  // and re-renders forever. `s.entries` only changes when the store reloads.
  const entries = useFoodLog((s) => s.entries);
  const loadForDate = useFoodLog((s) => s.loadForDate);
  const totals = useMemo(() => totalsFor(entries), [entries]);

  // The store holds one day at a time, so the screen asks for the day it shows.
  useEffect(() => {
    void loadForDate(date);
  }, [loadForDate, date]);

  const weightUnit = useProfile(selectWeightUnit);
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

  const weightTrend = useMemo(
    () =>
      calculateWeightTrend(
        weightRows.map((row) => ({ id: row.id, kg: row.kg, date: row.date })),
        date,
      ),
    [weightRows, date],
  );

  const balance = calculateEnergyBalance({
    target: calorieTarget,
    consumed: totals.calories,
    activeBurned: metrics?.activeEnergyKcal,
  });

  return (
    <Screen>
      <Caption>{formatLongDate(date)}</Caption>
      <Heading style={styles.greeting}>{greetingFor()}</Heading>

      {isUsingMockHealthData() ? (
        <View style={styles.notice}>
          <Body style={styles.noticeText}>
            Showing sample health data. Real steps, sleep and calories need a development build.
          </Body>
        </View>
      ) : null}

      {/* Hero: the single number this screen exists to show. */}
      <View style={styles.hero}>
        <Display color={balance.isOverBudget ? colors.danger : colors.text}>
          {Math.abs(balance.remaining).toLocaleString()}
        </Display>
        <Title style={styles.heroLabel} color={colors.textMuted}>
          {balance.isOverBudget ? 'calories over budget' : 'calories remaining'}
        </Title>

        <View style={styles.progressWrap}>
          <ProgressBar
            progress={balance.progress}
            color={balance.isOverBudget ? colors.danger : metricColors.food}
            trackColor={metricTints.food}
          />
          <View style={styles.progressLegend}>
            <Caption style={styles.legendText}>{totals.calories.toLocaleString()} eaten</Caption>
            <Caption style={styles.legendText}>
              {/* Only mention burned calories when that reading actually exists. */}
              {balance.usedActiveBurn
                ? `${metrics?.activeEnergyKcal?.toLocaleString()} burned`
                : `of ${calorieTarget.toLocaleString()} target`}
            </Caption>
          </View>
        </View>
      </View>

      <View style={styles.statRow}>
        <StatCard
          label="Steps"
          metric="steps"
          value={isLoading ? null : (metrics?.steps?.toLocaleString() ?? null)}
          detail={`goal ${stepGoal.toLocaleString()}`}
        />
        <StatCard
          label="Sleep"
          metric="sleep"
          value={isLoading ? null : (metrics?.sleepHours?.toString() ?? null)}
          unit="hrs"
          detail="last night"
        />
      </View>

      <View style={styles.statRow}>
        <StatCard
          label="Active burn"
          metric="food"
          value={isLoading ? null : (metrics?.activeEnergyKcal?.toLocaleString() ?? null)}
          unit="kcal"
          detail="today"
        />
        <StatCard
          label="Weight"
          metric="weight"
          value={
            weightTrend.latestKg == null
              ? null
              : fromKg(weightTrend.latestKg, weightUnit).toFixed(1)
          }
          unit={weightUnit}
          detail={formatWeightDelta(weightTrend.deltaKg, weightUnit)}
        />
      </View>

      <View style={styles.mealsSection}>
        <Heading style={styles.sectionHeading}>Today&apos;s meals</Heading>

        {entries.length === 0 ? (
          <Body color={colors.textMuted}>Nothing logged yet.</Body>
        ) : (
          <View style={styles.mealList}>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.mealRow}>
                <View style={styles.mealInfo}>
                  <Body>{entry.name}</Body>
                  <Caption style={styles.mealMeta}>
                    {entry.slot}
                    {entry.servings !== 1 ? ` -- ${entry.servings} servings` : ''}
                  </Caption>
                </View>
                <Body color={colors.textMuted}>{entry.calories} kcal</Body>
              </View>
            ))}
          </View>
        )}
      </View>

      <Button label="Log a meal" onPress={() => router.push('/food')} />
      <View style={styles.settingsLink}>
        <Button label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
      </View>
    </Screen>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    greeting: {
      marginTop: spacing.xs,
    },
    notice: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: t.metricTints.weight,
    },
    noticeText: {
      fontSize: 13,
      color: t.colors.text,
    },
    hero: {
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
    },
    heroLabel: {
      fontWeight: '500',
      marginTop: spacing.xs,
    },
    progressWrap: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    progressLegend: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    legendText: {
      textTransform: 'none',
      letterSpacing: 0,
      fontWeight: '500',
    },
    statRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    mealsSection: {
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
    },
    sectionHeading: {
      fontSize: 20,
      marginBottom: spacing.md,
    },
    mealList: {
      gap: spacing.sm,
    },
    mealRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: radius.md,
      padding: spacing.lg,
    },
    mealInfo: {
      gap: 2,
    },
    mealMeta: {
      textTransform: 'capitalize',
      letterSpacing: 0,
      fontWeight: '400',
    },
    settingsLink: {
      marginTop: spacing.md,
    },
  });
