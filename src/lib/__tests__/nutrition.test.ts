import {
  calculateEnergyBalance,
  caloriesFromMacros,
  macrosLookInconsistent,
  perServingFromBatch,
  scaleNutrition,
  sumNutrition,
  zeroIfMissing,
} from '../nutrition';

describe('zeroIfMissing', () => {
  it('passes real numbers through, including zero', () => {
    expect(zeroIfMissing(42)).toBe(42);
    expect(zeroIfMissing(0)).toBe(0);
  });

  it('treats null, undefined and NaN as zero', () => {
    expect(zeroIfMissing(null)).toBe(0);
    expect(zeroIfMissing(undefined)).toBe(0);
    expect(zeroIfMissing(Number.NaN)).toBe(0);
  });
});

describe('sumNutrition', () => {
  it('returns zeroes for an empty log', () => {
    expect(sumNutrition([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('adds every field across entries', () => {
    const total = sumNutrition([
      { calories: 310, protein: 12, carbs: 40, fat: 9 },
      { calories: 190, protein: 8, carbs: 22, fat: 6 },
    ]);
    expect(total).toEqual({ calories: 500, protein: 20, carbs: 62, fat: 15 });
  });
});

describe('calculateEnergyBalance', () => {
  it('subtracts what was eaten from the target', () => {
    const result = calculateEnergyBalance({ target: 2000, consumed: 1200 });
    expect(result.remaining).toBe(800);
    expect(result.net).toBe(1200);
    expect(result.isOverBudget).toBe(false);
  });

  it('gives back calories that were burned through activity', () => {
    const result = calculateEnergyBalance({ target: 2000, consumed: 1200, activeBurned: 400 });
    expect(result.net).toBe(800);
    expect(result.remaining).toBe(1200);
    expect(result.usedActiveBurn).toBe(true);
  });

  it('flags going over budget', () => {
    const result = calculateEnergyBalance({ target: 2000, consumed: 2300 });
    expect(result.remaining).toBe(-300);
    expect(result.isOverBudget).toBe(true);
  });

  // The distinction the dashboard depends on: a watch that has not synced must
  // not be presented as a confident "0 calories burned".
  it('reports active burn as unused when the value is missing, not as zero burn', () => {
    expect(calculateEnergyBalance({ target: 2000, consumed: 500 }).usedActiveBurn).toBe(false);
    expect(
      calculateEnergyBalance({ target: 2000, consumed: 500, activeBurned: null }).usedActiveBurn,
    ).toBe(false);
    expect(
      calculateEnergyBalance({ target: 2000, consumed: 500, activeBurned: 0 }).usedActiveBurn,
    ).toBe(false);
  });

  it('clamps progress between 0 and 1', () => {
    expect(calculateEnergyBalance({ target: 2000, consumed: 3000 }).progress).toBe(1);
    // Burning more than you ate yields a negative net, which must not render as
    // a negative-width progress bar.
    expect(
      calculateEnergyBalance({ target: 2000, consumed: 100, activeBurned: 600 }).progress,
    ).toBe(0);
  });

  it('does not produce NaN when the target is zero', () => {
    const result = calculateEnergyBalance({ target: 0, consumed: 500 });
    expect(result.progress).toBe(0);
    expect(Number.isNaN(result.progress)).toBe(false);
  });
});

describe('scaleNutrition', () => {
  const perServing = { calories: 310, protein: 12.4, carbs: 40.2, fat: 9.1 };

  it('scales a half portion', () => {
    expect(scaleNutrition(perServing, 0.5)).toEqual({
      calories: 155,
      protein: 6.2,
      carbs: 20.1,
      fat: 4.6,
    });
  });

  it('rounds away floating-point noise', () => {
    const result = scaleNutrition({ calories: 100, protein: 0.1, carbs: 0.2, fat: 0 }, 3);
    expect(result.carbs).toBe(0.6);
    expect(result.protein).toBe(0.3);
  });

  it('treats a negative serving count as zero rather than subtracting food', () => {
    expect(scaleNutrition(perServing, -2).calories).toBe(0);
  });
});

describe('perServingFromBatch', () => {
  it('divides a cooked batch across its servings', () => {
    // Chana masala, whole pot, serves 4.
    const result = perServingFromBatch({ calories: 1240, protein: 48, carbs: 160, fat: 36 }, 4);
    expect(result).toEqual({ calories: 310, protein: 12, carbs: 40, fat: 9 });
  });

  it('refuses a serving count of zero instead of returning Infinity', () => {
    expect(() =>
      perServingFromBatch({ calories: 1240, protein: 48, carbs: 160, fat: 36 }, 0),
    ).toThrow(/at least one/i);
  });
});

describe('caloriesFromMacros', () => {
  it('applies 4/4/9 Atwater factors', () => {
    expect(caloriesFromMacros({ protein: 10, carbs: 20, fat: 5 })).toBe(165);
  });
});

describe('macrosLookInconsistent', () => {
  it('accepts entries whose macros roughly match their calories', () => {
    // 12*4 + 40*4 + 9*9 = 289, close enough to the stated 310.
    expect(macrosLookInconsistent({ calories: 310, protein: 12, carbs: 40, fat: 9 })).toBe(false);
  });

  it('catches a decimal-point typo in the calorie field', () => {
    expect(macrosLookInconsistent({ calories: 31, protein: 12, carbs: 40, fat: 9 })).toBe(true);
  });

  it('stays quiet when macros were never entered', () => {
    expect(macrosLookInconsistent({ calories: 310, protein: 0, carbs: 0, fat: 0 })).toBe(false);
  });
});
