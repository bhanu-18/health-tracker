import {
  calculateRecipeTotals,
  formatAmount,
  isMassUnit,
  isVolumeUnit,
  nutritionForIngredient,
  servingsForIngredient,
  supportedUnits,
  type IngredientSource,
} from '../recipes';

/** Chickpeas: nutrition stated per 100 g, dry, so a known density. */
const chickpeas: IngredientSource = {
  perServing: { calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6 },
  servingGrams: 100,
  densityGPerMl: 0.85,
  isCountable: false,
};

/** Basmati rice: the food from the bug report. 350 kcal per 100 g dry. */
const basmati: IngredientSource = {
  perServing: { calories: 350, protein: 7.5, carbs: 78, fat: 0.9 },
  servingGrams: 100,
  densityGPerMl: 0.85,
  isCountable: false,
  servingLabel: '100 g',
};

/** Roti: nutrition stated per piece, with a known weight. Countable. */
const roti: IngredientSource = {
  perServing: { calories: 120, protein: 3, carbs: 23, fat: 2 },
  servingGrams: 40,
  isCountable: true,
  servingLabel: '1 medium',
};

/** Onion: countable, but no recorded weight and no density. */
const onion: IngredientSource = {
  perServing: { calories: 44, protein: 1.2, carbs: 10.3, fat: 0.1 },
  servingGrams: null,
  isCountable: true,
  servingLabel: '1 medium',
};

describe('unit families', () => {
  it('separates mass from volume from count', () => {
    expect(isMassUnit('g')).toBe(true);
    expect(isMassUnit('kg')).toBe(true);
    expect(isMassUnit('ml')).toBe(false);
    expect(isVolumeUnit('ml')).toBe(true);
    expect(isVolumeUnit('cup')).toBe(true);
    expect(isVolumeUnit('g')).toBe(false);
    expect(isVolumeUnit('piece')).toBe(false);
  });
});

describe('supportedUnits', () => {
  it('offers mass and volume for a weighed food with a known density', () => {
    expect(supportedUnits(basmati)).toEqual(['g', 'kg', 'ml', 'tsp', 'tbsp', 'cup']);
  });

  // The bug, stated as a rule: rice is not countable.
  it('does not offer pieces for something that cannot be counted', () => {
    expect(supportedUnits(basmati)).not.toContain('piece');
  });

  it('offers pieces for a countable food', () => {
    expect(supportedUnits(roti)).toContain('piece');
  });

  it('withholds volume when the density is unknown', () => {
    const noDensity: IngredientSource = { ...basmati, densityGPerMl: null };
    expect(supportedUnits(noDensity)).toEqual(['g', 'kg']);
  });

  it('offers only pieces when the weight is unknown', () => {
    expect(supportedUnits(onion)).toEqual(['piece']);
  });
});

/**
 * These assert the exact numbers the app displayed before density existed.
 * Every one was shown to the user with full confidence.
 */
describe('the reported wrong values', () => {
  it('costs a teaspoon of rice as a teaspoon, not a whole serving', () => {
    // Was 350 kcal. 1 tsp = 5 ml x 0.85 = 4.25 g, about 15 kcal.
    const result = nutritionForIngredient({ quantity: 1, unit: 'tsp' }, basmati);
    expect(result!.calories).toBeCloseTo(14.9, 0);
    expect(result!.calories).toBeLessThan(20);
  });

  it('costs a cup of rice as a cup, not a whole serving', () => {
    // Was 350 kcal. 1 cup = 240 ml x 0.85 = 204 g, about 714 kcal.
    const result = nutritionForIngredient({ quantity: 1, unit: 'cup' }, basmati);
    expect(result!.calories).toBeCloseTo(714, 0);
  });

  it('refuses a piece of rice rather than costing it as a serving', () => {
    // Was 350 kcal for "1 piece" of a food that has no pieces.
    expect(servingsForIngredient({ quantity: 1, unit: 'piece' }, basmati)).toBeNull();
  });

  it('does not report 100 ml of rice as 35,000 kcal', () => {
    // Was 100 servings. 100 ml x 0.85 = 85 g, about 298 kcal.
    const result = nutritionForIngredient({ quantity: 100, unit: 'ml' }, basmati);
    expect(result!.calories).toBeCloseTo(297.5, 0);
    expect(result!.calories).toBeLessThan(400);
  });
});

describe('servingsForIngredient', () => {
  it('scales a weight against the food serving weight', () => {
    // 400 g of a food stated per 100 g is four servings.
    expect(servingsForIngredient({ quantity: 400, unit: 'g' }, chickpeas)).toBe(4);
  });

  it('converts kilograms', () => {
    expect(servingsForIngredient({ quantity: 1, unit: 'kg' }, chickpeas)).toBe(10);
  });

  it('treats a count as a multiple of the serving', () => {
    expect(servingsForIngredient({ quantity: 2, unit: 'piece' }, roti)).toBe(2);
  });

  it('converts a volume through density, not by pretending it is a serving', () => {
    // 1 tbsp = 15 ml x 0.85 = 12.75 g, against a 100 g serving.
    expect(servingsForIngredient({ quantity: 1, unit: 'tbsp' }, chickpeas)).toBeCloseTo(0.1275, 4);
  });

  it('scales volume linearly', () => {
    const one = servingsForIngredient({ quantity: 1, unit: 'cup' }, chickpeas)!;
    const two = servingsForIngredient({ quantity: 2, unit: 'cup' }, chickpeas)!;
    expect(two).toBeCloseTo(one * 2, 6);
  });

  // The case that would otherwise silently corrupt a recipe: a weight given
  // for a food whose serving weight is unknown cannot be scaled at all.
  it('refuses to guess a weight when the serving weight is unknown', () => {
    expect(servingsForIngredient({ quantity: 150, unit: 'g' }, onion)).toBeNull();
  });

  it('still handles a counted amount of that same food', () => {
    expect(servingsForIngredient({ quantity: 2, unit: 'piece' }, onion)).toBe(2);
  });

  it('refuses a volume when the density is unknown', () => {
    // Previously returned 1.5 servings, silently treating a cup as a serving.
    expect(servingsForIngredient({ quantity: 1.5, unit: 'cup' }, onion)).toBeNull();
  });

  it('returns zero for a zero or negative amount', () => {
    expect(servingsForIngredient({ quantity: 0, unit: 'g' }, chickpeas)).toBe(0);
    expect(servingsForIngredient({ quantity: -5, unit: 'g' }, chickpeas)).toBe(0);
  });

  it('refuses a unit the food does not support at all', () => {
    expect(servingsForIngredient({ quantity: 1, unit: 'piece' }, chickpeas)).toBeNull();
  });
});

describe('nutritionForIngredient', () => {
  it('scales every macro by the serving count', () => {
    expect(nutritionForIngredient({ quantity: 200, unit: 'g' }, chickpeas)).toEqual({
      calories: 328,
      protein: 17.8,
      carbs: 54.8,
      fat: 5.2,
    });
  });

  it('propagates the unknown case as null rather than a wrong number', () => {
    expect(nutritionForIngredient({ quantity: 150, unit: 'g' }, onion)).toBeNull();
  });
});

describe('calculateRecipeTotals', () => {
  // Chana masala, serves 4 -- the worked example from the spec.
  const lines = [
    { nutrition: { calories: 656, protein: 35.6, carbs: 109.6, fat: 10.4 } }, // 400g chickpeas
    { nutrition: { calories: 44, protein: 1.2, carbs: 10.3, fat: 0.1 } }, // 1 onion
    { nutrition: { calories: 60, protein: 3, carbs: 13, fat: 0.5 } }, // tomato puree
    { nutrition: { calories: 480, protein: 0, carbs: 0, fat: 54 } }, // 4 tbsp oil
  ];

  it('sums the batch and divides across servings', () => {
    const totals = calculateRecipeTotals(lines, 4);
    expect(totals.batch.calories).toBe(1240);
    expect(totals.perServing.calories).toBe(310);
  });

  it('returns zeroes for a recipe with no ingredients', () => {
    const totals = calculateRecipeTotals([], 4);
    expect(totals.batch).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    expect(totals.perServing.calories).toBe(0);
  });

  // A stored zero must not turn the whole recipe into Infinity.
  it('clamps a serving count below one instead of dividing by zero', () => {
    const totals = calculateRecipeTotals(lines, 0);
    expect(Number.isFinite(totals.perServing.calories)).toBe(true);
    expect(totals.perServing.calories).toBe(1240);
  });

  it('rounds away floating-point noise', () => {
    const totals = calculateRecipeTotals(
      [{ nutrition: { calories: 100, protein: 0.1, carbs: 0.2, fat: 0 } }],
      3,
    );
    expect(totals.perServing.protein).toBe(0);
    expect(totals.batch.carbs).toBe(0.2);
  });
});

describe('formatAmount', () => {
  it('formats weights and volumes', () => {
    expect(formatAmount({ quantity: 400, unit: 'g' })).toBe('400 g');
    expect(formatAmount({ quantity: 1.5, unit: 'cup' })).toBe('1.5 cup');
  });

  it('pluralises pieces', () => {
    expect(formatAmount({ quantity: 1, unit: 'piece' })).toBe('1 piece');
    expect(formatAmount({ quantity: 2, unit: 'piece' })).toBe('2 pieces');
  });
});
