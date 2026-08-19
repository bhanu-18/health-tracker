import { StyleSheet, View } from 'react-native';
import { Screen } from '../src/components/Screen';
import { Body, Caption, Heading } from '../src/components/Typography';
import { getHealthProvider, isUsingMockHealthData } from '../src/services/health';
import { useProfile } from '../src/stores/profile';
import { colors, radius, spacing } from '../src/theme/tokens';

/** Settings -- health permissions and goals. */
export default function SettingsScreen() {
  const calorieTarget = useProfile((s) => s.calorieTarget);
  const stepGoal = useProfile((s) => s.stepGoal);
  const goalWeightKg = useProfile((s) => s.goalWeightKg);

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

      <Heading style={styles.section}>Goals</Heading>
      <View style={styles.card}>
        <Row label="Daily calories" value={`${calorieTarget.toLocaleString()} kcal`} />
        <Row label="Daily steps" value={stepGoal.toLocaleString()} />
        <Row label="Goal weight" value={goalWeightKg != null ? `${goalWeightKg} kg` : 'Not set'} />
      </View>

      <Body style={styles.note} color={colors.textMuted}>
        Editing these values is not wired up yet.
      </Body>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Caption>{label}</Caption>
      <Body>{value}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  section: { marginTop: spacing.xl },
  row: { gap: spacing.xs },
  note: { marginTop: spacing.xl, fontSize: 14 },
});
