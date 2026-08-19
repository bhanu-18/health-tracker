/**
 * Weight trend maths.
 *
 * Body weight swings 1-2 kg day to day on water alone, so comparing today's
 * reading against last Monday's is mostly measuring hydration. Everything here
 * works on averaged windows instead, which is what makes a trend line readable.
 */

export type WeightEntry = {
  id: string;
  /** Kilograms. Stored in kg always; display units are a presentation concern. */
  kg: number;
  /** Calendar day this reading belongs to, as `YYYY-MM-DD`. */
  date: string;
};

export type WeightTrend = {
  /** Most recent raw reading, or null when nothing has been logged. */
  latestKg: number | null;
  /** Average over the last 7 days, or null when that window is empty. */
  currentAverageKg: number | null;
  /** Average over the 7 days before that, or null when that window is empty. */
  priorAverageKg: number | null;
  /**
   * Change between the two windows. Negative means weight is falling.
   * Null when there is not enough history to compare two windows honestly --
   * the UI must show "not enough data yet" rather than a fabricated 0.0.
   */
  deltaKg: number | null;
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

const mean = (values: readonly number[]): number =>
  values.reduce((sum, n) => sum + n, 0) / values.length;

/** Days between two `YYYY-MM-DD` strings, ignoring clock time and DST entirely. */
export function daysBetween(fromISODate: string, toISODate: string): number {
  const MS_PER_DAY = 86_400_000;
  const from = Date.parse(`${fromISODate}T00:00:00Z`);
  const to = Date.parse(`${toISODate}T00:00:00Z`);
  return Math.round((to - from) / MS_PER_DAY);
}

/**
 * Compare the last 7 days against the 7 before them.
 *
 * `asOf` is passed in rather than read from the system clock, so this function
 * stays pure and its tests never break at midnight or in another timezone.
 */
export function calculateWeightTrend(
  entries: readonly WeightEntry[],
  asOf: string,
  windowDays = 7,
): WeightTrend {
  if (entries.length === 0) {
    return { latestKg: null, currentAverageKg: null, priorAverageKg: null, deltaKg: null };
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latestKg = sorted[sorted.length - 1]!.kg;

  const ageInDays = (entry: WeightEntry) => daysBetween(entry.date, asOf);

  // Age 0 is today, so the current window is ages 0..6 and the prior window 7..13.
  const current = sorted.filter((e) => {
    const age = ageInDays(e);
    return age >= 0 && age < windowDays;
  });
  const prior = sorted.filter((e) => {
    const age = ageInDays(e);
    return age >= windowDays && age < windowDays * 2;
  });

  const currentAverageKg = current.length > 0 ? round1(mean(current.map((e) => e.kg))) : null;
  const priorAverageKg = prior.length > 0 ? round1(mean(prior.map((e) => e.kg))) : null;

  return {
    latestKg,
    currentAverageKg,
    priorAverageKg,
    deltaKg:
      currentAverageKg != null && priorAverageKg != null
        ? round1(currentAverageKg - priorAverageKg)
        : null,
  };
}

/**
 * Format a trend delta for display, with an explicit sign so direction is
 * unmistakable at a glance ("-0.4 kg" reads very differently from "0.4 kg").
 */
export function formatDelta(deltaKg: number | null): string {
  if (deltaKg == null) return 'Not enough data yet';
  if (deltaKg === 0) return 'No change';
  const sign = deltaKg > 0 ? '+' : '';
  return `${sign}${deltaKg.toFixed(1)} kg`;
}
