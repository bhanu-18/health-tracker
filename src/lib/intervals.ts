/**
 * Interval union maths, used for deduplicating sleep.
 *
 * Why this exists
 * ---------------
 * Steps and active energy are HealthKit *quantity* types, so HKStatisticsQuery
 * reconciles overlapping sources into one correct total for us. Sleep is a
 * *category* type, and there is no statistics query for category samples --
 * Apple does not deduplicate it.
 *
 * So a user wearing an Apple Watch with a sleep app installed can have the same
 * night recorded twice, as two overlapping sets of samples. Summing sample
 * durations would report roughly 16 hours of sleep for an 8 hour night.
 *
 * The fix is to treat sleep as a set of time intervals, merge every overlap,
 * and measure the union. Two sources recording the same night contribute that
 * night once. Two genuinely separate stretches (a nap and a night) still count
 * separately, which a naive "earliest start to latest end" would get wrong.
 */

export type Interval = {
  start: Date;
  end: Date;
};

/**
 * Merge overlapping and touching intervals into a minimal covering set.
 *
 * Intervals that merely touch (one ends exactly when the next begins) are
 * joined, because sleep stages are recorded as adjacent segments -- core, deep,
 * REM -- and treating those as separate would be an artefact of how the watch
 * writes data rather than anything about the night.
 */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals]
    .filter((i) => i.end.getTime() > i.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (sorted.length === 0) return [];

  const merged: Interval[] = [{ start: sorted[0]!.start, end: sorted[0]!.end }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!;
    const last = merged[merged.length - 1]!;

    if (current.start.getTime() <= last.end.getTime()) {
      // Overlaps or touches the run we are building -- extend it.
      // max() matters: the current interval may sit entirely inside the last.
      if (current.end.getTime() > last.end.getTime()) {
        last.end = current.end;
      }
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }

  return merged;
}

/** Total covered time in milliseconds, counting overlapping regions once. */
export function totalCoveredMs(intervals: readonly Interval[]): number {
  return mergeIntervals(intervals).reduce(
    (total, interval) => total + (interval.end.getTime() - interval.start.getTime()),
    0,
  );
}

/** Total covered time in hours, rounded to one decimal. */
export function totalCoveredHours(intervals: readonly Interval[]): number {
  const hours = totalCoveredMs(intervals) / 3_600_000;
  return Math.round(hours * 10) / 10;
}
