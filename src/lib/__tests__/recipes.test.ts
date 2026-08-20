import {
  calculateRecipeTotals,
  formatAmount,
  isMassUnit,
  nutritionForIngredient,
  servingsForIngredient,
  type IngredientSource,
} from '../recipes';

/** Chickpeas: nutrition stated per 100 g. */
const chickpeas: IngredientSource = {
  perServing: { calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6 },
  servingGrams: 100,
};

/** Roti: nutrition stated per piece, with a known weight. */
const roti: IngredientSource = {
  perServing: { calories: 120, protein: 3, carbs: 23, fat: 2 },
  servingGrams: 40,
  servingLabel: '1 medium',
};

/** Onion: stated per medium onion, weight unknown. */
const onion: IngredientSource = {
  perServing: { calories: 44, protein: 1.2, carbs: 10.3, fat: 0.1 },
  servingGrams: null,
  servingLabel: '1 medium',
};

describe('isMassUnit', () => {
  it('recognises mass units only', () => {
    expect(isMassUnit('g')).toBe(true);
    expect(isMassUnit('kg')).toBe(true);
    expect(isMassUnit('ml')).toBe(false);
    expect(isMassUnit('piece')).toBe(false);
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

  // The case that would otherwise silently corrupt a recipe: a weight given
  // for a food whose serving weight is unknown cannot be scaled at all.
  it('refuses to guess a weight when the serving weight is unknown', () => {
    expect(servingsForIngredient({ quantity: 150, unit: 'g' }, onion)).toBeNull();
  });

  it('still handles a counted amount of that same food', () => {
    expect(servingsForIngredient({ quantity: 2, unit: 'piece' }, onion)).toBe(2);
  });

  it('treats volume as a multiple of the serving, not a mass', () => {
    // Converting ml to grams would need a density this app does not store.
    expect(servingsForIngredient({ quantity: 1.5, unit: 'cup' }, onion)).toBe(1.5);
  });

  it('returns zero for a zero or negative amount', () => {
    expect(servingsForIngredient({ quantity: 0, unit: 'g' }, chickpeas)).toBe(0);
    expect(servingsForIngredient({ quantity: -5, unit: 'g' }, chickpeas)).toBe(0);
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
