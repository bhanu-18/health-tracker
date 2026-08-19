import { calculateWeightTrend, daysBetween, formatDelta, type WeightEntry } from '../weight';

const entry = (date: string, kg: number): WeightEntry => ({ id: date, date, kg });

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2026-08-01', '2026-08-08')).toBe(7);
    expect(daysBetween('2026-08-08', '2026-08-08')).toBe(0);
  });

  it('handles month boundaries', () => {
    expect(daysBetween('2026-07-31', '2026-08-01')).toBe(1);
  });
});

describe('calculateWeightTrend', () => {
  it('reports nothing at all when no weight has ever been logged', () => {
    expect(calculateWeightTrend([], '2026-08-18')).toEqual({
      latestKg: null,
      currentAverageKg: null,
      priorAverageKg: null,
      deltaKg: null,
    });
  });

  // The important case: one week of data is not two, and the app must say so
  // rather than inventing a delta of 0.0 that reads as "you have plateaued".
  it('withholds a delta until there are two windows to compare', () => {
    const trend = calculateWeightTrend(
      [entry('2026-08-16', 80), entry('2026-08-17', 79.8)],
      '2026-08-18',
    );
    expect(trend.currentAverageKg).toBe(79.9);
    expect(trend.priorAverageKg).toBeNull();
    expect(trend.deltaKg).toBeNull();
  });

  it('compares the last 7 days against the 7 before them', () => {
    const trend = calculateWeightTrend(
      [
        // Prior window: ages 7..13 -> 2026-08-05 .. 2026-08-11
        entry('2026-08-06', 81),
        entry('2026-08-09', 80.6),
        // Current window: ages 0..6 -> 2026-08-12 .. 2026-08-18
        entry('2026-08-13', 80.2),
        entry('2026-08-17', 79.4),
      ],
      '2026-08-18',
    );
    expect(trend.priorAverageKg).toBe(80.8);
    expect(trend.currentAverageKg).toBe(79.8);
    expect(trend.deltaKg).toBe(-1);
    expect(trend.latestKg).toBe(79.4);
  });

  it('takes the latest reading by date, not by array order', () => {
    const trend = calculateWeightTrend(
      [entry('2026-08-17', 79.4), entry('2026-08-12', 80.2)],
      '2026-08-18',
    );
    expect(trend.latestKg).toBe(79.4);
  });

  it('ignores readings older than both windows', () => {
    const trend = calculateWeightTrend(
      [entry('2026-01-01', 95), entry('2026-08-17', 79.4)],
      '2026-08-18',
    );
    expect(trend.currentAverageKg).toBe(79.4);
    expect(trend.priorAverageKg).toBeNull();
  });
});

describe('formatDelta', () => {
  it('signs the direction explicitly', () => {
    expect(formatDelta(-0.4)).toBe('-0.4 kg');
    expect(formatDelta(0.4)).toBe('+0.4 kg');
  });

  it('describes the empty and flat cases in words', () => {
    expect(formatDelta(null)).toBe('Not enough data yet');
    expect(formatDelta(0)).toBe('No change');
  });
});
