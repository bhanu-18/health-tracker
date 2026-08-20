import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Body, Caption, Title } from './Typography';
import type { FoodLogEntry } from '../db/schema';
import { radius, spacing, type Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

type Props = {
  entry: FoodLogEntry | null;
  onCancel: () => void;
  onSave: (servings: number) => void;
  onDelete: () => void;
};

/** Common portions. Matches the picker used when logging. */
const PORTIONS = [0.5, 1, 1.5, 2, 3];

/**
 * Change or remove an already-logged meal.
 *
 * Without this the log was append-only: one mistap put three servings of
 * biryani in your history permanently. A log that cannot be corrected is a log
 * that stops being trusted, and then stops being kept.
 *
 * Nutrition is stored pre-scaled, so the per-serving figures are recovered by
 * dividing by the servings recorded at the time.
 */
export function EditMealSheet({ entry, onCancel, onSave, onDelete }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [servings, setServings] = useState(entry?.servings ?? 1);

  if (!entry) return null;

  const perServing = entry.servings > 0 ? entry.calories / entry.servings : entry.calories;
  const projected = Math.round(perServing * servings);

  return (
    <BottomSheet
      visible
      title={entry.name}
      onDismiss={onCancel}
      footer={
        <>
          <View style={styles.save}>
            <Button label="Save" onPress={() => onSave(servings)} />
          </View>
          <Button label="Cancel" variant="secondary" onPress={onCancel} />
        </>
      }
    >
      <View>
        <Body color={theme.colors.textMuted}>
          {`Logged as ${entry.slot} · ${Math.round(perServing)} kcal a serving`}
        </Body>

        <Caption style={styles.sectionLabel}>Servings</Caption>
        <View style={styles.row}>
          {PORTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setServings(option)}
              style={[styles.chip, servings === option && styles.chipSelected]}
              accessibilityLabel={`${option} servings`}
            >
              <Body color={servings === option ? theme.colors.primaryText : theme.colors.text}>
                {option}
              </Body>
            </Pressable>
          ))}
        </View>

        <View style={styles.totals}>
          <Title color={theme.metricColors.food}>{`${projected} kcal`}</Title>
          {servings !== entry.servings ? (
            <Caption style={styles.was} color={theme.colors.textFaint}>
              {`was ${entry.calories} kcal`}
            </Caption>
          ) : null}
        </View>

        {/* Destructive, so it sits apart from the portion controls rather than
            beside them where a mis-tap while adjusting would delete the entry. */}
        <Pressable onPress={onDelete} style={styles.delete} accessibilityLabel="Remove this meal">
          <Body color={theme.colors.danger}>Remove from today</Body>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: t.colors.surface,
      ...t.shadows.card,
    },
    chipSelected: { backgroundColor: t.colors.primary },
    totals: {
      marginTop: spacing.xl,
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: t.metricTints.food,
      gap: spacing.xs,
    },
    was: { textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
    delete: { marginTop: spacing.xl, alignItems: 'center', paddingVertical: spacing.md },
    save: { marginBottom: spacing.md },
  });
