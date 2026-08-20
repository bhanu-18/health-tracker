import { emptyNutrition, type NutritionFacts } from './nutrition';

/**
 * Recipe maths: turning "400 g chickpeas, 1 medium onion" into nutrition.
 *
 * This is the part of the app that makes its numbers trustworthy. Everything
 * else meters out averages; here the user states what actually went in the pot,
 * and each portion is derived from that.
 */

/**
 * The units an amount can be given in.
 *
 * Three families, and each needs different information to be convertible:
 *
 *   - MASS (g, kg) needs the food's serving weight.
 *   - VOLUME (ml, tsp, tbsp, cup) needs its density. A volume is not a mass:
 *     a cup of oil and a cup of flour weigh very differently.
 *   - COUNT (piece) needs the food to be a discrete item at all.
 *
 * Where the required information is missing, the unit is not offered and the
 * conversion returns null. The previous version instead treated any non-mass
 * amount as one whole serving, which reported a teaspoon of rice as 350 kcal --
 * about thirty times over, stated with complete confidence.
 */
export type IngredientUnit = 'g' | 'kg' | 'ml' | 'l' | 'tbsp' | 'tsp' | 'cup' | 'piece';

/** Grams per unit, for mass units. */
const MASS_UNITS: Partial<Record<IngredientUnit, number>> = {
  g: 1,
  kg: 1000,
};

/**
 * Millilitres per unit, for volume units.
 *
 * Metric spoon and cup sizes, which is what Indian recipes and packaging use.
 * US customary differs (a US cup is 237 ml, a US tbsp 14.8), but the gap is
 * under 2% and far smaller than the variation in how a cup is filled.
 */
const VOLUME_UNITS: Partial<Record<IngredientUnit, number>> = {
  ml: 1,
  l: 1000,
  tsp: 5,
  tbsp: 15,
  cup: 240,
};

export const isMassUnit = (unit: IngredientUnit): boolean => unit in MASS_UNITS;
export const isVolumeUnit = (unit: IngredientUnit): boolean => unit in VOLUME_UNITS;

export type IngredientSource = {
  /** Nutrition for one serving of the underlying food. */
  perServing: NutritionFacts;
  /** Grams in one serving. Required for mass and volume amounts. */
  servingGrams: number | null;
  /** Grams per millilitre. Required for volume amounts. */
  densityGPerMl?: number | null;
  /** Whether one serving is a discrete countable item. */
  isCountable?: boolean;
  /** The food's own serving label, e.g. "1 medium". For messages only. */
  servingLabel?: string;
};

export type IngredientAmount = {
  quantity: number;
  unit: IngredientUnit;
};

/**
 * Which units this food can actually be measured in.
 *
 * The UI offers exactly these. Showing a unit that cannot be converted is what
 * produced "1 piece of rice" and "1 tsp = 350 kcal": the control implied the
 * app understood the question, and it did not.
 */
export function supportedUnits(source: IngredientSource): IngredientUnit[] {
  const units: IngredientUnit[] = [];

  if (source.servingGrams != null && source.servingGrams > 0) {
    units.push('g', 'kg');

    // Volume needs a mass to convert into, so it needs the serving weight too.
    if (source.densityGPerMl != null && source.densityGPerMl > 0) {
      units.push('ml', 'tsp', 'tbsp', 'cup');
    }
  }

  if (source.isCountable) units.push('piece');

  return units;
}

/**
 * How many servings of a food an ingredient line represents.
 *
 * Returns null when the amount cannot be converted, which the caller must
 * surface rather than substitute. A recipe quietly wrong is worse than one the
 * app admits it cannot compute, because only the second can be noticed.
 */
export function servingsForIngredient(
  amount: IngredientAmount,
  source: IngredientSource,
): number | null {
  if (!supportedUnits(source).includes(amount.unit)) return null;
  if (amount.quantity <= 0) return 0;

  if (amount.unit === 'piece') return amount.quantity;

  const servingGrams = source.servingGrams;
  if (servingGrams == null || servingGrams <= 0) return null;

  if (isMassUnit(amount.unit)) {
    const grams = amount.quantity * (MASS_UNITS[amount.unit] ?? 1);
    return grams / servingGrams;
  }

  const millilitres = amount.quantity * (VOLUME_UNITS[amount.unit] ?? 1);
  const density = source.densityGPerMl;
  if (density == null || density <= 0) return null;

  return (millilitres * density) / servingGrams;
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
