import { meanOf, totalOf, RANGE_DAYS } from '../useHistory';

type Day = {
  date: string;
  steps: number | null;
  sleepHours: number | null;
  activeEnergyKcal: number | null;
  caloriesEaten: number | null;
  weightKg: number | null;
};

const day = (date: string, steps: number | null, calories: number | null = null): Day => ({
  date,
  steps,
  sleepHours: null,
  activeEnergyKcal: null,
  caloriesEaten: calories,
  weightKg: null,
});

describe('range lengths', () => {
  it('covers a week and a month', () => {
    expect(RANGE_DAYS.week).toBe(7);
    expect(RANGE_DAYS.month).toBe(30);
  });
});

describe('totalOf and meanOf', () => {
  const days = [day('2026-08-18', 8000), day('2026-08-19', null), day('2026-08-20', 10000)];

  it('sums only the days with data', () => {
    expect(totalOf(days, (d) => d.steps)).toBe(18000);
  });

  /**
   * The average must divide by the days that were recorded, not by the days in
   * the range. Dividing by 3 here would report 6,000 a day for someone who
   * averaged 9,000 across the days they actually wore the watch.
   */
  it('averages over recorded days, not calendar days', () => {
    expect(meanOf(days, (d) => d.steps)).toBe(9000);
  });

  it('returns null when nothing in the range has data', () => {
    expect(totalOf([day('2026-08-19', null)], (d) => d.steps)).toBeNull();
    expect(meanOf([day('2026-08-19', null)], (d) => d.steps)).toBeNull();
  });

  it('returns null for an empty range', () => {
    expect(totalOf([], (d) => d.steps)).toBeNull();
    expect(meanOf([], (d) => d.steps)).toBeNull();
  });

  it('counts a genuine zero, which is a measurement rather than a gap', () => {
    const withZero = [day('2026-08-19', 0), day('2026-08-20', 10000)];
    expect(meanOf(withZero, (d) => d.steps)).toBe(5000);
  });

  it('reads a different metric from the same days', () => {
    const withCalories = [day('2026-08-19', null, 1800), day('2026-08-20', null, 2200)];
    expect(meanOf(withCalories, (d) => d.caloriesEaten)).toBe(2000);
  });
});
