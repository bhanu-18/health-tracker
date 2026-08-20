import { normalizeName } from '../../../lib/foodSearch';
import { SEED_FOODS } from '../foods';
import { SEED_INGREDIENTS } from '../ingredients';

/**
 * Guards on the shipped food data.
 *
 * These are cheap and catch the class of mistake that is invisible in review:
 * a copy-pasted id, a missing serving weight, a decimal typo. Every one of them
 * would surface only at runtime, and some only inside a recipe total.
 */

const ALL = [...SEED_FOODS, ...SEED_INGREDIENTS];

describe('seed data', () => {
  it('has no duplicate ids', () => {
    const seen = new Map<string, number>();
    for (const food of ALL) {
      seen.set(food.id, (seen.get(food.id) ?? 0) + 1);
    }
    const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id);
    expect(duplicates).toEqual([]);
  });

  it('has no duplicate names', () => {
    const seen = new Map<string, number>();
    for (const food of ALL) {
      seen.set(food.name, (seen.get(food.name) ?? 0) + 1);
    }
    const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([name]) => name);
    expect(duplicates).toEqual([]);
  });

  it('stores a normalised name matching the display name', () => {
    // A stale nameNormalized makes a food unfindable under its own spelling.
    for (const food of ALL) {
      expect(food.nameNormalized).toBe(normalizeName(food.name));
    }
  });

  it('marks everything as seed data, so a reseed cannot touch user foods', () => {
    for (const food of ALL) {
      expect(food.source).toBe('seed');
    }
  });

  /**
   * The one that matters for recipes: scaling an amount in grams divides by
   * servingGrams and returns null when it is missing. A raw ingredient without
   * it simply cannot be used by weight, which is how most recipes are written.
   */
  it('gives every raw ingredient a serving weight', () => {
    const missing = SEED_INGREDIENTS.filter(
      (food) => food.servingGrams == null || food.servingGrams <= 0,
    ).map((food) => food.name);
    expect(missing).toEqual([]);
  });

  it('has plausible macros for its calories', () => {
    // Atwater factors (4/4/9) applied to stated macros should land near the
    // stated calories. A decimal typo shows up as a large drift.
    //
    // Both a relative AND an absolute threshold are needed. Atwater
    // systematically over-predicts for high-fibre, low-calorie foods, because
    // fibre is counted as carbohydrate but not fully metabolised -- lemon
    // implies 44 kcal against a real 29. That is a 50% relative gap but only
    // 15 kcal, and flagging it would mean either deleting correct data or
    // loosening the threshold until real typos slip through.
    const MIN_ABSOLUTE_DRIFT_KCAL = 25;
    const MAX_RELATIVE_DRIFT = 0.35;

    const suspicious = ALL.filter((food) => {
      if (food.calories <= 5) return false;
      const implied = (food.proteinG ?? 0) * 4 + (food.carbsG ?? 0) * 4 + (food.fatG ?? 0) * 9;
      if (implied === 0) return false;

      const absolute = Math.abs(implied - food.calories);
      const relative = absolute / food.calories;
      return absolute > MIN_ABSOLUTE_DRIFT_KCAL && relative > MAX_RELATIVE_DRIFT;
    }).map((food) => `${food.name}: stated ${food.calories}`);

    expect(suspicious).toEqual([]);
  });

  // Proves the check above still catches what it is for.
  it('would flag a decimal typo', () => {
    const typo = { name: 'Typo', calories: 31, proteinG: 12, carbsG: 40, fatG: 9 };
    const implied = typo.proteinG * 4 + typo.carbsG * 4 + typo.fatG * 9;
    const absolute = Math.abs(implied - typo.calories);
    expect(absolute).toBeGreaterThan(25);
    expect(absolute / typo.calories).toBeGreaterThan(0.35);
  });

  it('ships enough ingredients for recipes to be usable', () => {
    // The original seed was prepared dishes only, which made the recipe feature
    // unusable -- you cannot build fried rice from a list of finished dishes.
    expect(SEED_INGREDIENTS.length).toBeGreaterThan(80);
  });
});
