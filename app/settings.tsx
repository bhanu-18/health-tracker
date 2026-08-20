import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { Toast } from '../src/components/Toast';
import { Body, Caption, Heading } from '../src/components/Typography';
import { getHealthProvider, isUsingMockHealthData } from '../src/services/health';
import { getAllEntries } from '../src/db/repositories/foodLog';
import { getAllWeightEntries } from '../src/db/repositories/weight';
import { buildFullExport } from '../src/lib/export';
import { today } from '../src/lib/dates';
import { fromKg, toKg, type WeightUnit } from '../src/lib/units';
import {
  selectCalorieTarget,
  selectGoalWeightKg,
  selectStepGoal,
  selectWeightUnit,
  useProfile,
} from '../src/stores/profile';
import { radius, spacing, type Theme, type ThemeMode } from '../src/theme/tokens';
import { useTheme, useThemeMode, useThemedStyles } from '../src/theme/useTheme';

const parse = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Settings: health source and the goals every other screen reads.
 *
 * These were previously display-only, which meant the dashboard's headline
 * figure was a hardcoded 2,000 kcal for everyone. Not a cosmetic gap: if the
 * real target is 1,800, every "calories remaining" the app has ever shown was
 * wrong by 200, with no way to correct it.
 */
export default function SettingsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const calorieTarget = useProfile(selectCalorieTarget);
  const stepGoal = useProfile(selectStepGoal);
  const goalWeightKg = useProfile(selectGoalWeightKg);
  const weightUnit = useProfile(selectWeightUnit);
  const updateProfile = useProfile((s) => s.update);
  const themeMode = useThemeMode();
  const theme = useTheme();

  const [calories, setCalories] = useState(String(calorieTarget));
  const [steps, setSteps] = useState(String(stepGoal));
  const [goalWeight, setGoalWeight] = useState(
    goalWeightKg != null ? fromKg(goalWeightKg, weightUnit).toFixed(1) : '',
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Editing anything clears a previous confirmation.
   *
   * Otherwise "Saved" keeps sitting there over fields that have since been
   * changed and not saved -- a message that is not merely stale but actively
   * wrong about the current state.
   */
  const edit = (setter: (value: string) => void) => (value: string) => {
    setStatus(null);
    setError(null);
    setter(value);
  };

  /**
   * Re-seed the goal weight when the display unit changes.
   *
   * Adjusted during render rather than in an effect. React re-runs this
   * component immediately without painting the intermediate state, so there is
   * no flash of the old number and no extra render pass -- which is what the
   * set-state-in-effect rule exists to prevent.
   *
   * Only the unit needs this: the profile is loaded before any screen mounts,
   * so the other fields' initial state is already correct.
   */
  const [seededUnit, setSeededUnit] = useState(weightUnit);
  if (seededUnit !== weightUnit) {
    setSeededUnit(weightUnit);
    setGoalWeight(goalWeightKg != null ? fromKg(goalWeightKg, weightUnit).toFixed(1) : '');
  }

  const changeUnit = async (next: WeightUnit) => {
    if (next === weightUnit) return;
    // Only the display unit changes. Stored weights stay in kilograms, so
    // nothing is converted and no history is touched.
    await updateProfile({ weightUnit: next });
  };

  const [isExporting, setIsExporting] = useState(false);

  /**
   * Hand the whole log to the iOS share sheet.
   *
   * Shared as text rather than written to a file, because a file export needs
   * expo-file-system and expo-sharing -- both native, both a rebuild. React
   * Native's Share is built in, and the share sheet still offers Files, Mail
   * and AirDrop, so the data reaches the same places. Worth revisiting at the
   * next rebuild for large logs.
   */
  const exportData = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const [entries, weights] = await Promise.all([getAllEntries(), getAllWeightEntries()]);
      if (entries.length === 0 && weights.length === 0) {
        setError('Nothing to export yet.');
        return;
      }

      await Share.share({
        title: `Health Tracker export ${today()}`,
        message: buildFullExport(entries, weights, today()),
      });
      setStatus('Export ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not export your data.');
    } finally {
      setIsExporting(false);
    }
  };

  const save = async () => {
    const calorieValue = Math.round(parse(calories));
    const stepValue = Math.round(parse(steps));

    if (calorieValue <= 0) {
      setError('Enter a daily calorie target.');
      return;
    }
    if (stepValue <= 0) {
      setError('Enter a daily step goal.');
      return;
    }

    const goalValue = goalWeight.trim().length > 0 ? parse(goalWeight) : null;
    if (goalValue != null && goalValue <= 0) {
      setError('Enter a goal weight, or leave it blank.');
      return;
    }

    setError(null);
    try {
      await updateProfile({
        dailyCalorieTarget: calorieValue,
        dailyStepGoal: stepValue,
        // Converted at the edge: storage is always kilograms.
        goalWeightKg: goalValue != null ? toKg(goalValue, weightUnit) : null,
      });
      setStatus('Goals saved');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your settings.');
    }
  };

  return (
    <Screen>
      <Heading>Health data</Heading>
      <View style={styles.card}>
        <Row label="Source" value={getHealthProvider().name} />
        <Row
          label="Status"
          value={isUsingMockHealthData() ? 'Sample data (needs a dev build)' : 'Connected'}
        />
      </View>

      <Heading style={styles.section}>Daily goals</Heading>
      <View style={styles.form}>
        <FormField
          label="Daily calories"
          value={calories}
          onChangeText={edit(setCalories)}
          keyboardType="number-pad"
          suffix="kcal"
        />
        <FormField
          label="Daily steps"
          value={steps}
          onChangeText={edit(setSteps)}
          keyboardType="number-pad"
          suffix="steps"
        />
        <FormField
          label="Goal weight"
          value={goalWeight}
          onChangeText={edit(setGoalWeight)}
          keyboardType="decimal-pad"
          suffix={weightUnit}
          placeholder="Optional"
        />
      </View>

      <Caption style={styles.unitLabel}>Weight unit</Caption>
      <View style={styles.unitRow}>
        {(['kg', 'lb'] as WeightUnit[]).map((option) => (
          <Pressable
            key={option}
            onPress={() => void changeUnit(option)}
            style={[styles.chip, weightUnit === option && styles.chipSelected]}
            accessibilityLabel={`Show weight in ${option}`}
          >
            <Body color={weightUnit === option ? colors.primaryText : colors.text}>{option}</Body>
          </Pressable>
        ))}
      </View>
      <Body style={styles.unitHint} color={colors.textFaint}>
        Display only. Weights are stored in kilograms, so switching converts nothing and changes no
        history.
      </Body>

      <Caption style={styles.unitLabel}>Appearance</Caption>
      <View style={styles.unitRow}>
        {(
          [
            { value: 'auto', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ] as { value: ThemeMode; label: string }[]
        ).map((option) => (
          <Pressable
            key={option.value}
            onPress={() => void updateProfile({ themeMode: option.value })}
            style={[styles.chip, themeMode === option.value && styles.chipSelected]}
            accessibilityLabel={`Appearance ${option.label}`}
          >
            <Body color={themeMode === option.value ? colors.primaryText : colors.text}>
              {option.label}
            </Body>
          </Pressable>
        ))}
      </View>
      <Body style={styles.unitHint} color={colors.textFaint}>
        Auto follows your phone&apos;s setting, including any schedule you have set for it.
      </Body>

      {error ? (
        <Body style={styles.error} color={colors.danger}>
          {error}
        </Body>
      ) : null}

      <Button label="Save goals" onPress={() => void save()} />

      <Heading style={styles.section}>Your data</Heading>
      <Body style={styles.dataHint} color={theme.colors.textMuted}>
        Everything is stored on this phone only. Export a copy so it survives losing or reinstalling
        the app.
      </Body>
      <Button
        label={isExporting ? 'Preparing...' : 'Export as CSV'}
        variant="secondary"
        onPress={() => void exportData()}
      />

      <Toast message={status} onDismiss={() => setStatus(null)} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  // Its own hook call: styles are per-component now, not a module singleton.
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.row}>
      <Caption>{label}</Caption>
      <Body>{value}</Body>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginTop: spacing.md,
      gap: spacing.lg,
    },
    section: { marginTop: spacing.xxl },
    dataHint: { fontSize: 14, marginTop: spacing.sm, marginBottom: spacing.lg },
    form: { gap: spacing.lg, marginTop: spacing.md },
    row: { gap: spacing.xs },
    unitLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
    unitRow: { flexDirection: 'row', gap: spacing.sm },
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
    },
    chipSelected: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    unitHint: { fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.xl },
    error: { marginBottom: spacing.md, fontSize: 14 },
  });
