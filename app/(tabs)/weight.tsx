import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { TrendChart, type TrendPoint } from '../../src/components/TrendChart';
import { Body, Caption, Display, Heading, Title } from '../../src/components/Typography';
import { getRecentWeightEntries, logWeight } from '../../src/db/repositories/weight';
import type { WeightEntryRow } from '../../src/db/schema';
import { today } from '../../src/lib/dates';
import { calculateWeightTrend, daysBetween } from '../../src/lib/weight';
import { defaultEntryValue, formatWeightDelta, fromKg, toKg } from '../../src/lib/units';
import { selectGoalWeightKg, selectWeightUnit, useProfile } from '../../src/stores/profile';
import { colors, metricColors, radius, spacing } from '../../src/theme/tokens';

/**
 * Screen 3 -- Weight.
 *
 * Quick entry and a trend line. The trend deliberately compares seven-day
 * averages rather than today against yesterday: body weight swings 1-2 kg on
 * hydration alone, so a day-to-day delta mostly measures how much water you
 * drank, and reads as progress or failure that is not real.
 */
export default function WeightScreen() {
  const unit = useProfile(selectWeightUnit);
  const goalWeightKg = useProfile(selectGoalWeightKg);
  const updateProfile = useProfile((s) => s.update);

  const [entries, setEntries] = useState<WeightEntryRow[]>([]);
  const [input, setInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const date = today();

  const load = useCallback(async () => {
    const rows = await getRecentWeightEntries();
    setEntries(rows);
    const latest = rows[rows.length - 1];
    setInput(defaultEntryValue(latest?.kg ?? null, unit));
  }, [unit]);

  useEffect(() => {
    // Same exception as useDailyHealth: the rule exists because setting state
    // from an effect costs an extra render, but loading on mount unavoidably
    // does so -- the rows are not available during render. A data-fetching
    // layer that owns loading state outside the component is the real fix, and
    // is worth adding once more than a couple of screens read from SQLite.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const trend = useMemo(
    () =>
      calculateWeightTrend(
        entries.map((row) => ({ id: row.id, kg: row.kg, date: row.date })),
        date,
      ),
    [entries, date],
  );

  const points: TrendPoint[] = useMemo(() => {
    if (entries.length === 0) return [];
    const first = entries[0]!.date;
    return entries.map((row) => ({
      // X as days since the first reading, so gaps in logging show as gaps
      // rather than being evenly spaced and implying daily measurement.
      x: daysBetween(first, row.date),
      y: fromKg(row.kg, unit),
    }));
  }, [entries, unit]);

  const save = async () => {
    const parsed = Number.parseFloat(input);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a weight, for example 82.5');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await logWeight(date, toKg(parsed, unit));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your weight.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUnit = () => {
    void updateProfile({ weightUnit: unit === 'kg' ? 'lb' : 'kg' });
  };

  const latestKg = trend.latestKg;

  return (
    <Screen>
      <View style={styles.header}>
        <Caption>Current weight</Caption>
        <Pressable onPress={toggleUnit} hitSlop={8} accessibilityLabel="Switch weight unit">
          <Caption color={metricColors.weight}>{unit === 'kg' ? 'Show lb' : 'Show kg'}</Caption>
        </Pressable>
      </View>

      <Display color={latestKg == null ? colors.textFaint : colors.text}>
        {latestKg == null ? '--' : fromKg(latestKg, unit).toFixed(1)}
      </Display>
      <Title style={styles.unitLabel} color={colors.textMuted}>
        {unit}
      </Title>

      <Body style={styles.trend} color={colors.textMuted}>
        {formatWeightDelta(trend.deltaKg, unit)}
        {trend.deltaKg != null ? ' vs the previous week' : ''}
      </Body>

      <View style={styles.card}>
        <TrendChart
          points={points}
          color={metricColors.weight}
          goal={goalWeightKg != null ? fromKg(goalWeightKg, unit) : null}
          formatValue={(value) => value.toFixed(1)}
        />
      </View>

      <Heading style={styles.sectionHeading}>Log today</Heading>
      <View style={styles.entryRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          keyboardType="decimal-pad"
          placeholder={unit === 'kg' ? '82.5' : '181.9'}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          accessibilityLabel="Weight"
        />
        <Caption style={styles.inputUnit} color={colors.textMuted}>
          {unit}
        </Caption>
      </View>

      {error ? (
        <Body style={styles.error} color={colors.danger}>
          {error}
        </Body>
      ) : null}

      <Button label={isSaving ? 'Saving...' : 'Save weight'} onPress={() => void save()} />

      <Body style={styles.note} color={colors.textFaint}>
        Weighing twice in a day replaces the earlier reading, so one day counts once in the trend.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitLabel: { fontWeight: '500', marginTop: spacing.xs },
  trend: { marginTop: spacing.sm },
  card: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  sectionHeading: { fontSize: 20, marginTop: spacing.xl, marginBottom: spacing.md },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    fontSize: 28,
    color: colors.text,
    padding: 0,
    minHeight: 36,
  },
  inputUnit: { textTransform: 'none', letterSpacing: 0 },
  error: { marginBottom: spacing.md, fontSize: 14 },
  note: { marginTop: spacing.lg, fontSize: 13 },
});
