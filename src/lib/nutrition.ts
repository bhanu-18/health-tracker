/**
 * Pure nutrition and energy-balance maths.
 *
 * Deliberately free of React, SQLite and HealthKit imports. Everything here is a
 * plain function over plain data, which is why it can be unit-tested without a
 * simulator, a device or a database.
 */

export type Macros = {
  /** grams */
  protein: number;
  /** grams */
  carbs: number;
  /** grams */
  fat: number;
};

export type NutritionFacts = Macros & {
  /** kcal */
  calories: number;
};

export type LoggedFood = NutritionFacts & {
  id: string;
  name: string;
  /**
   * How many servings were eaten. 1.5 means "one and a half portions".
   * The nutrition fields above are already totals for this entry, not per-serving.
   */
  servings: number;
};

export const emptyMacros = (): Macros => ({ protein: 0, carbs: 0, fat: 0 });

export const emptyNutrition = (): NutritionFacts => ({ calories: 0, ...emptyMacros() });

/**
 * Health data is the most common source of nulls in this app: a metric can be
 * absent because the user denied permission, because the watch has not synced,
 * or because the day has not happened yet. Those are all legitimately "no data"
 * and must not silently become 0 -- a 0 step count reads as "you did nothing
 * today", which is a different and wrong claim.
 *
 * Use this only where an absent value genuinely should behave as zero, such as
 * summing calories eaten when nothing has been logged.
 */
export const zeroIfMissing = (value: number | null | undefined): number =>
  value == null || Number.isNaN(value) ? 0 : value;

export function sumNutrition(entries: readonly NutritionFacts[]): NutritionFacts {
  return entries.reduce<NutritionFacts>(
    (total, entry) => ({
      calories: total.calories + zeroIfMissing(entry.calories),
      protein: total.protein + zeroIfMissing(entry.protein),
      carbs: total.carbs + zeroIfMissing(entry.carbs),
      fat: total.fat + zeroIfMissing(entry.fat),
    }),
    emptyNutrition(),
  );
}

export type EnergyBalanceInput = {
  /** Daily calorie goal from the user's profile. */
  target: number;
  /** Total kcal logged as eaten today. */
  consumed: number;
  /**
   * Active calories burned, read from HealthKit / Health Connect.
   * `null` means "not available" -- see `EnergyBalance.usedActiveBurn`.
   */
  activeBurned?: number | null;
};

export type EnergyBalance = {
  /** Positive means calories still available; negative means over budget. */
  remaining: number;
  /** `consumed - activeBurned`. The figure `remaining` is derived from. */
  net: number;
  /** True once the user has eaten more than the target allows. */
  isOverBudget: boolean;
  /**
   * Whether active-burn data actually contributed. The dashboard uses this to
   * decide whether to show "including 320 kcal burned" or to stay silent,
   * rather than implying a confident 0 when the watch simply has not synced.
   */
  usedActiveBurn: boolean;
  /** 0..1, clamped. Lets the view render a progress bar with no maths of its own. */
  progress: number;
};

/**
 * Calories remaining, accounting for activity.
 *
 *   remaining = target - (consumed - activeBurned)
 *
 * Burning energy increases what you may eat, which is why active burn is
 * subtracted from intake rather than added to the target. The two are
 * arithmetically identical, but this framing keeps `net` meaningful as
 * "the calories that actually stuck today".
 */
export function calculateEnergyBalance({
  target,
  consumed,
  activeBurned,
}: EnergyBalanceInput): EnergyBalance {
  const burned = zeroIfMissing(activeBurned);
  const safeConsumed = zeroIfMissing(consumed);
  const net = safeConsumed - burned;
  const remaining = target - net;

  return {
    remaining,
    net,
    isOverBudget: remaining < 0,
    usedActiveBurn: activeBurned != null && !Number.isNaN(activeBurned) && activeBurned > 0,
    // Guard against a zero or negative target, which would otherwise divide by
    // zero and render a NaN-width progress bar.
    progress: target > 0 ? Math.min(Math.max(net / target, 0), 1) : 0,
  };
}

const roundGrams = (grams: number): number => Math.round(grams * 10) / 10;

/**
 * Scale a recipe's per-serving nutrition to the portion actually eaten.
 *
 * Rounded to whole kcal and one decimal gram, because presenting
 * "310.00000000000006 kcal" is how a tracker loses a user's trust.
 */
export function scaleNutrition(perServing: NutritionFacts, servings: number): NutritionFacts {
  const factor = Math.max(servings, 0);
  return {
    calories: Math.round(perServing.calories * factor),
    protein: roundGrams(perServing.protein * factor),
    carbs: roundGrams(perServing.carbs * factor),
    fat: roundGrams(perServing.fat * factor),
  };
}

/**
 * Derive per-serving nutrition from a recipe's whole-batch totals.
 *
 * This is the core of the recipe library: you enter what went into the pot once,
 * and every future portion is calculated rather than guessed.
 */
export function perServingFromBatch(batchTotal: NutritionFacts, serves: number): NutritionFacts {
  if (serves <= 0) {
    throw new Error('A recipe must serve at least one person.');
  }
  return {
    calories: Math.round(batchTotal.calories / serves),
    protein: roundGrams(batchTotal.protein / serves),
    carbs: roundGrams(batchTotal.carbs / serves),
    fat: roundGrams(batchTotal.fat / serves),
  };
}

/**
 * Calories implied by macros, using Atwater factors (4/4/9 kcal per gram).
 *
 * Used to sanity-check hand-entered recipes: if a user types macros whose
 * implied calories are far from the calories they also typed, one of the two is
 * a typo, and the app should say so at entry time rather than quietly
 * corrupting months of history.
 */
export function caloriesFromMacros({ protein, carbs, fat }: Macros): number {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

/**
 * Whether stated calories and stated macros disagree by more than `tolerance`
 * (default 20%). Returns false for entries with no macros recorded at all,
 * since "unknown" is not the same as "inconsistent".
 */
export function macrosLookInconsistent(facts: NutritionFacts, tolerance = 0.2): boolean {
  const hasMacros = facts.protein > 0 || facts.carbs > 0 || facts.fat > 0;
  if (!hasMacros || facts.calories <= 0) return false;

  const implied = caloriesFromMacros(facts);
  const drift = Math.abs(implied - facts.calories) / facts.calories;
  return drift > tolerance;
}
