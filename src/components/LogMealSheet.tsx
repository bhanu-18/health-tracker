import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Body, Caption, Title } from './Typography';
import type { MealSlot } from '../db/schema';
import { scaleNutrition, type NutritionFacts } from '../lib/nutrition';
import { radius, spacing } from '../theme/tokens';
import type { Theme } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../theme/useTheme';

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
  const { colors, metricColors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [servings, setServings] = useState(1);

  if (!target) return null;

  const totals = scaleNutrition(target.perServing, servings);

  return (
    <BottomSheet
      visible
      title={target.name}
      onDismiss={onCancel}
      footer={
        <>
          <Button label="Log it" onPress={() => onConfirm({ slot, servings, totals })} />
          <View style={styles.cancel}>
            <Button label="Cancel" variant="secondary" onPress={onCancel} />
          </View>
        </>
      }
    >
      {/* Scrolls so the chips stay reachable on a small screen, while the
          confirm button stays pinned in the sheet footer. */}
      <ScrollView showsVerticalScrollIndicator={false}>
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
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
    },
    chipSelected: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    },
    chipText: { textTransform: 'capitalize' },
    totals: {
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: t.metricTints.food,
      gap: spacing.xs,
    },
    cancel: { marginTop: spacing.md },
  });
