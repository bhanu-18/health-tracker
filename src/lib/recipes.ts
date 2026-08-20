import { emptyNutrition, type NutritionFacts } from './nutrition';

/**
 * Recipe maths: turning "400 g chickpeas, 1 medium onion" into nutrition.
 *
 * This is the part of the app that makes its numbers trustworthy. Everything
 * else meters out averages; here the user states what actually went in the pot,
 * and each portion is derived from that.
 */

/**
 * How an ingredient's amount relates to its food's serving.
 *
 * Two genuinely different cases, and conflating them is the main way a recipe
 * total goes wrong:
 *
 *   - WEIGHT: "400 g chickpeas" against a food whose serving is 100 g means
 *     four servings. Requires the food to record its serving weight.
 *   - COUNT: "2 rotis" against a food whose serving is one roti means two
 *     servings. The unit is a description, not a measurement.
 *
 * Volume (ml, cup, tbsp) is treated as a count of the food's stated serving,
 * because converting volume to mass needs a density this app does not store --
 * 150 ml of tomato puree and 150 ml of oil weigh very different amounts.
 */
export type IngredientUnit = 'g' | 'kg' | 'ml' | 'l' | 'tbsp' | 'tsp' | 'cup' | 'piece';

/** Units that express mass, and their grams per unit. */
const MASS_UNITS: Partial<Record<IngredientUnit, number>> = {
  g: 1,
  kg: 1000,
};

export const isMassUnit = (unit: IngredientUnit): boolean => unit in MASS_UNITS;

export type IngredientSource = {
  /** Nutrition for one serving of the underlying food. */
  perServing: NutritionFacts;
  /** Grams in one serving, when known. Required to scale by weight. */
  servingGrams: number | null;
  /** The food's own serving label, e.g. "1 medium". For messages only. */
  servingLabel?: string;
};

export type IngredientAmount = {
  quantity: number;
  unit: IngredientUnit;
};

/**
 * How many servings of a food an ingredient line represents.
 *
 * Returns null when it cannot be determined -- specifically, a weight amount
 * against a food with no recorded serving weight. Null is deliberate: guessing
 * would silently produce a wrong recipe total, and a recipe quietly wrong by
 * 40% is worse than one the app admits it cannot compute.
 */
export function servingsForIngredient(
  amount: IngredientAmount,
  source: IngredientSource,
): number | null {
  if (amount.quantity <= 0) return 0;

  if (isMassUnit(amount.unit)) {
    if (source.servingGrams == null || source.servingGrams <= 0) return null;
    const gramsPerUnit = MASS_UNITS[amount.unit] ?? 1;
    return (amount.quantity * gramsPerUnit) / source.servingGrams;
  }

  // Count and volume units: the quantity is a multiple of the food's serving.
  return amount.quantity;
}

/** Nutrition contributed by one ingredient line, or null if it cannot be scaled. */
export function nutritionForIngredient(
  amount: IngredientAmount,
  source: IngredientSource,
): NutritionFacts | null {
  const servings = servingsForIngredient(amount, source);
  if (servings == null) return null;

  return {
    calories: round1(source.perServing.calories * servings),
    protein: round1(source.perServing.protein * servings),
    carbs: round1(source.perServing.carbs * servings),
    fat: round1(source.perServing.fat * servings),
  };
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

export type RecipeLine = {
  /** Nutrition this line contributes to the whole batch. */
  nutrition: NutritionFacts;
};

export type RecipeTotals = {
  /** Nutrition for the entire batch. */
  batch: NutritionFacts;
  /** Nutrition for one serving. */
  perServing: NutritionFacts;
};

/**
 * Total a recipe and divide it across its servings.
 *
 * `serves` below 1 is clamped rather than rejected: the UI should prevent it,
 * but a stored zero must not turn every nutrition figure into Infinity and
 * corrupt the display of an otherwise valid recipe.
 */
export function calculateRecipeTotals(lines: readonly RecipeLine[], serves: number): RecipeTotals {
  const batch = lines.reduce<NutritionFacts>(
    (total, line) => ({
      calories: total.calories + line.nutrition.calories,
      protein: total.protein + line.nutrition.protein,
      carbs: total.carbs + line.nutrition.carbs,
      fat: total.fat + line.nutrition.fat,
    }),
    emptyNutrition(),
  );

  const safeServes = Math.max(1, Math.round(serves));

  return {
    batch: {
      calories: Math.round(batch.calories),
      protein: round1(batch.protein),
      carbs: round1(batch.carbs),
      fat: round1(batch.fat),
    },
    perServing: {
      calories: Math.round(batch.calories / safeServes),
      protein: round1(batch.protein / safeServes),
      carbs: round1(batch.carbs / safeServes),
      fat: round1(batch.fat / safeServes),
    },
  };
}

/** Human-readable amount, e.g. "400 g" or "2 pieces". */
export function formatAmount({ quantity, unit }: IngredientAmount): string {
  const value = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1);
  if (unit === 'piece') return `${value} ${quantity === 1 ? 'piece' : 'pieces'}`;
  return `${value} ${unit}`;
}
