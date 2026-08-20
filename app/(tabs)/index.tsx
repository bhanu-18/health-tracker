import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Screen } from '../../src/components/Screen';
import { StatCard } from '../../src/components/StatCard';
import { Body, Caption, Display, Heading, Title } from '../../src/components/Typography';
import { useDailyHealth } from '../../src/hooks/useDailyHealth';
import { formatLongDate, greetingFor, today } from '../../src/lib/dates';
import { calculateEnergyBalance, sumNutrition } from '../../src/lib/nutrition';
import { isUsingMockHealthData } from '../../src/services/health';
import { useFoodLog } from '../../src/stores/foodLog';
import { useProfile } from '../../src/stores/profile';
import { colors, metricColors, metricTints, radius, spacing } from '../../src/theme/tokens';

/**
 * Screen 1 -- Today.
 *
 * One dominant hero metric (calories remaining), then supporting stats. The
 * layout is deliberately not an equal-weight grid: the number you act on is
 * many times larger than the numbers you merely glance at.
 */
export default function TodayScreen() {
  const router = useRouter();
  const date = today();

  const { metrics, isLoading } = useDailyHealth(date);
  const calorieTarget = useProfile((s) => s.calorieTarget);
  const stepGoal = useProfile((s) => s.stepGoal);
  // Select the raw array, then derive. A selector must return a stable
  // reference: Zustand compares results with Object.is, so a selector that
  // filters or reduces builds a new object every call, which reads as "changed"
  // and re-renders forever. `s.entries` only changes when an entry is actually
  // added or removed.
  const allEntries = useFoodLog((s) => s.entries);
  const entries = useMemo(() => allEntries.filter((e) => e.date === date), [allEntries, date]);
  const totals = useMemo(() => sumNutrition(entries), [entries]);

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
        <StatCard label="Weight" metric="weight" value={null} unit="kg" detail="not logged" />
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

const styles = StyleSheet.create({
  greeting: {
    marginTop: spacing.xs,
  },
  notice: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: metricTints.weight,
  },
  noticeText: {
    fontSize: 13,
    color: colors.text,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
