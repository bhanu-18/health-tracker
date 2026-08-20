import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { FormField } from './FormField';
import { SearchField } from './SearchField';
import { Body, Caption } from './Typography';
import { getAllFoods } from '../db/repositories/foods';
import type { Food } from '../db/schema';
import { searchFoods } from '../lib/foodSearch';
import { formatAmount, nutritionForIngredient, type IngredientUnit } from '../lib/recipes';
import { colors, metricColors, metricTints, radius, spacing } from '../theme/tokens';

const UNITS: IngredientUnit[] = ['g', 'kg', 'ml', 'tbsp', 'tsp', 'cup', 'piece'];

/**
 * Generous, because the list is scrollable and a short cap is indistinguishable
 * from "the database does not have it" -- which is precisely how this picker
 * gave the impression of being nearly empty.
 */
const RESULT_LIMIT = 60;

export type NewIngredient = {
  foodId: string | null;
  name: string;
  quantity: number;
  unit: IngredientUnit;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type Props = {
  visible: boolean;
  onCancel: () => void;
  onAdd: (ingredient: NewIngredient) => void;
};

/**
 * Pick a food, state how much of it went in.
 *
 * The nutrition preview updates as you type, because a wrong unit is easiest to
 * notice by its result: "400 g chickpeas" reading 6 kcal tells you instantly
 * that the food's serving weight is missing or the unit is wrong.
 */
export function AddIngredientSheet({ visible, onCancel, onAdd }: Props) {
  const [foods, setFoods] = useState<Food[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState<IngredientUnit>('g');

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void getAllFoods().then((rows) => {
      if (!cancelled) setFoods(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  /**
   * Browsing with no query shows raw ingredients first.
   *
   * This sheet exists to build recipes, and a recipe is made of ingredients --
   * surfacing prepared dishes ahead of them (as an alphabetical list does) is
   * why the picker felt empty of anything you could actually cook with.
   */
  const results = useMemo(() => {
    if (query.trim().length === 0) {
      const isIngredient = (food: Food) => food.id.startsWith('ing-');
      return [...foods]
        .sort((a, b) => {
          const byKind = Number(isIngredient(b)) - Number(isIngredient(a));
          return byKind !== 0 ? byKind : a.name.localeCompare(b.name);
        })
        .slice(0, RESULT_LIMIT);
    }

    return searchFoods(
      foods.map((food) => ({
        id: food.id,
        name: food.name,
        nameNormalized: food.nameNormalized,
        calories: food.calories,
        proteinG: food.proteinG,
        carbsG: food.carbsG,
        fatG: food.fatG,
        food,
      })),
      query,
    )
      .slice(0, RESULT_LIMIT)
      .map((row) => row.food);
  }, [foods, query]);

  const parsedQuantity = Number.parseFloat(quantity);

  const preview = useMemo(() => {
    if (!selected || !Number.isFinite(parsedQuantity)) return null;
    return nutritionForIngredient(
      { quantity: parsedQuantity, unit },
      {
        perServing: {
          calories: selected.calories,
          protein: selected.proteinG,
          carbs: selected.carbsG,
          fat: selected.fatG,
        },
        servingGrams: selected.servingGrams,
        servingLabel: selected.servingLabel,
      },
    );
  }, [selected, parsedQuantity, unit]);

  const reset = () => {
    setQuery('');
    setSelected(null);
    setQuantity('100');
    setUnit('g');
  };

  const confirm = () => {
    if (!selected || !preview) return;
    onAdd({
      foodId: selected.id,
      name: selected.name,
      quantity: parsedQuantity,
      unit,
      calories: preview.calories,
      proteinG: preview.protein,
      carbsG: preview.carbs,
      fatG: preview.fat,
    });
    reset();
  };

  return (
    <BottomSheet
      visible={visible}
      title="Add ingredient"
      onDismiss={onCancel}
      footer={<Button label="Cancel" variant="secondary" onPress={onCancel} />}
    >
      <View style={styles.body}>
        {selected ? (
          <>
            <Pressable onPress={() => setSelected(null)} style={styles.selected}>
              <Body>{selected.name}</Body>
              <Caption color={colors.textFaint}>
                {`${selected.servingLabel} · tap to change`}
              </Caption>
            </Pressable>

            <View style={styles.amountRow}>
              <View style={styles.quantityField}>
                <FormField
                  label="Amount"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Caption style={styles.unitsLabel}>Unit</Caption>
            <View style={styles.unitRow}>
              {UNITS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setUnit(option)}
                  style={[styles.chip, unit === option && styles.chipSelected]}
                >
                  <Body color={unit === option ? colors.primaryText : colors.text}>{option}</Body>
                </Pressable>
              ))}
            </View>

            <View style={styles.preview}>
              {preview ? (
                <>
                  <Body color={metricColors.food}>
                    {`${formatAmount({ quantity: parsedQuantity, unit })} · ${preview.calories} kcal`}
                  </Body>
                  <Caption style={styles.previewMacros} color={colors.textMuted}>
                    {`P ${preview.protein}g · C ${preview.carbs}g · F ${preview.fat}g`}
                  </Caption>
                </>
              ) : (
                /* The honest failure: a weight given for a food with no recorded
                   serving weight cannot be converted, so the app says so
                   instead of inventing a number. */
                <Body style={styles.warning} color={colors.danger}>
                  {`"${selected.name}" has no recorded weight per serving, so an amount in ${unit} cannot be converted. Use ${selected.servingLabel.includes('g') ? 'grams' : 'piece or cup'} instead.`}
                </Body>
              )}
            </View>

            <Button label="Add" onPress={confirm} />
          </>
        ) : (
          <>
            {/* The search field is the first thing in a fixed-height sheet, so
                it stays in the same place regardless of how many results the
                query returns. */}
            <SearchField value={query} onChangeText={setQuery} placeholder="Search ingredients" />
            {results.length === 0 ? (
              <Body style={styles.noResults} color={colors.textMuted}>
                {`Nothing matches "${query}". Try another spelling, or add it as a new food first.`}
              </Body>
            ) : null}
            <ScrollView
              style={styles.results}
              keyboardShouldPersistTaps="handled"
              // Lets a tap dismiss the keyboard without stealing the tap from a
              // result row, which "on-drag" alone would do.
              keyboardDismissMode="on-drag"
            >
              {results.map((food) => (
                <Pressable
                  key={food.id}
                  onPress={() => {
                    setSelected(food);
                    // Default to the unit the food is actually measured in, so
                    // the common case needs no further tapping.
                    setUnit(food.servingGrams != null ? 'g' : 'piece');
                    setQuantity(food.servingGrams != null ? String(food.servingGrams) : '1');
                  }}
                  style={styles.resultRow}
                >
                  <Body>{food.name}</Body>
                  <Caption color={colors.textFaint}>
                    {`${food.servingLabel} · ${Math.round(food.calories)} kcal${
                      food.cuisine ? ` · ${food.cuisine}` : ''
                    }`}
                  </Caption>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  // Flexes into whatever the sheet has left, rather than a fixed height that
  // would leave dead space on a short list and clip a long one.
  results: { flex: 1, marginTop: spacing.md },
  noResults: { marginTop: spacing.lg, fontSize: 14 },
  resultRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 2,
  },
  selected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 2,
    marginBottom: spacing.lg,
  },
  amountRow: { flexDirection: 'row', gap: spacing.md },
  quantityField: { flex: 1 },
  unitsLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  preview: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: metricTints.food,
    gap: spacing.xs,
  },
  previewMacros: { textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  warning: { fontSize: 14 },
});
