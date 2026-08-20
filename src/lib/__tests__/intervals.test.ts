import { mergeIntervals, totalCoveredHours, totalCoveredMs, type Interval } from '../intervals';

/** Build an interval from two `HH:MM` times on a fixed date, for readability. */
const at = (start: string, end: string): Interval => ({
  start: new Date(`2026-08-18T${start}:00`),
  end: new Date(`2026-08-18T${end}:00`),
});

describe('mergeIntervals', () => {
  it('returns nothing for no intervals', () => {
    expect(mergeIntervals([])).toEqual([]);
  });

  it('leaves disjoint intervals alone', () => {
    const result = mergeIntervals([at('01:00', '02:00'), at('04:00', '05:00')]);
    expect(result).toHaveLength(2);
  });

  it('merges overlapping intervals', () => {
    const result = mergeIntervals([at('01:00', '03:00'), at('02:00', '04:00')]);
    expect(result).toHaveLength(1);
    expect(result[0]!.start).toEqual(new Date('2026-08-18T01:00:00'));
    expect(result[0]!.end).toEqual(new Date('2026-08-18T04:00:00'));
  });

  it('merges intervals that merely touch, since sleep stages are adjacent segments', () => {
    const result = mergeIntervals([at('01:00', '02:00'), at('02:00', '03:00')]);
    expect(result).toHaveLength(1);
    expect(result[0]!.end).toEqual(new Date('2026-08-18T03:00:00'));
  });

  it('absorbs an interval fully contained in another', () => {
    const result = mergeIntervals([at('01:00', '06:00'), at('02:00', '03:00')]);
    expect(result).toHaveLength(1);
    expect(result[0]!.end).toEqual(new Date('2026-08-18T06:00:00'));
  });

  it('does not depend on input order', () => {
    const ordered = mergeIntervals([at('01:00', '03:00'), at('02:00', '04:00')]);
    const reversed = mergeIntervals([at('02:00', '04:00'), at('01:00', '03:00')]);
    expect(reversed).toEqual(ordered);
  });

  it('discards zero-length and inverted intervals', () => {
    expect(mergeIntervals([at('02:00', '02:00')])).toEqual([]);
    expect(mergeIntervals([at('05:00', '04:00')])).toEqual([]);
  });
});

describe('totalCoveredHours', () => {
  // The bug this whole module exists to prevent.
  it('counts a night recorded by two devices once, not twice', () => {
    const watch = at('23:00', '23:59');
    const sleepApp = at('23:00', '23:59');
    expect(totalCoveredHours([watch, sleepApp])).toBe(totalCoveredHours([watch]));
  });

  it('counts partially overlapping records as their union', () => {
    // 01:00-05:00 and 04:00-07:00 cover 01:00-07:00, so 6 hours -- not 7.
    expect(totalCoveredHours([at('01:00', '05:00'), at('04:00', '07:00')])).toBe(6);
  });

  it('still counts genuinely separate stretches separately', () => {
    // A 1-hour nap and a 2-hour stretch are 3 hours, not one 5-hour block
    // spanning from the first start to the last end.
    expect(totalCoveredHours([at('01:00', '02:00'), at('05:00', '07:00')])).toBe(3);
  });

  it('sums adjacent sleep stages into one continuous night', () => {
    const core = at('23:00', '23:30');
    const deep = at('23:30', '23:50');
    expect(totalCoveredMs([core, deep])).toBe(50 * 60 * 1000);
  });

  it('reports zero when there are no samples', () => {
    expect(totalCoveredHours([])).toBe(0);
  });
});
