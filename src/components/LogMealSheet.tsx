import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { Button } from './Button';
import { Body, Caption, Heading, Title } from './Typography';
import type { MealSlot } from '../db/schema';
import { scaleNutrition, type NutritionFacts } from '../lib/nutrition';
import { colors, metricColors, metricTints, radius, spacing } from '../theme/tokens';

export type LogMealTarget = {
  name: string;
  servingLabel: string;
  /** Per-serving nutrition. */
  perServing: NutritionFacts;
  foodId?: string | null;
  recipeId?: string | null;
};

type Props = {
  target: LogMealTarget | null;
  defaultSlot: MealSlot;
  onCancel: () => void;
  onConfirm: (args: { slot: MealSlot; servings: number; totals: NutritionFacts }) => void;
};

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Common portions. Free-text entry is deferred; these cover almost every meal. */
const PORTIONS = [0.5, 1, 1.5, 2, 3];

/**
 * Portion and meal-slot picker.
 *
 * Deliberately a small set of taps rather than a number keyboard: logging has to
 * be fast enough to do while serving food, and "how many servings" is nearly
 * always one of a handful of answers. Typing 1.0 is slower than tapping it.
 */
export function LogMealSheet({ target, defaultSlot, onCancel, onConfirm }: Props) {
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [servings, setServings] = useState(1);

  if (!target) return null;

  const totals = scaleNutrition(target.perServing, servings);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      {/* Tapping the backdrop dismisses, which is the gesture people expect. */}
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss" />

      <View style={styles.sheet}>
        <Heading style={styles.name}>{target.name}</Heading>
        <Body color={colors.textMuted}>{target.servingLabel}</Body>

        <Caption style={styles.sectionLabel}>Meal</Caption>
        <View style={styles.row}>
          {SLOTS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setSlot(option)}
              style={[styles.chip, slot === option && styles.chipSelected]}
            >
              <Body
                style={styles.chipText}
                color={slot === option ? colors.primaryText : colors.text}
              >
                {option}
              </Body>
            </Pressable>
          ))}
        </View>

        <Caption style={styles.sectionLabel}>Servings</Caption>
        <View style={styles.row}>
          {PORTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setServings(option)}
              style={[styles.chip, servings === option && styles.chipSelected]}
            >
              <Body color={servings === option ? colors.primaryText : colors.text}>{option}</Body>
            </Pressable>
          ))}
        </View>

        <View style={styles.totals}>
          <Title color={metricColors.food}>{totals.calories} kcal</Title>
          <Body color={colors.textMuted}>
            {`P ${totals.protein}g  ·  C ${totals.carbs}g  ·  F ${totals.fat}g`}
          </Body>
        </View>

        <Button label="Log it" onPress={() => onConfirm({ slot, servings, totals })} />
        <View style={styles.cancel}>
          <Button label="Cancel" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.35)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xs,
  },
  name: { fontSize: 24 },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { textTransform: 'capitalize' },
  totals: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: metricTints.food,
    gap: spacing.xs,
  },
  cancel: { marginTop: spacing.md },
});
