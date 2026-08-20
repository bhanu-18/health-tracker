import type { DailyHealthMetrics } from '../../services/health';
import { averageOf } from '../useWeeklyHealth';

const day = (date: string, steps: number | null): DailyHealthMetrics => ({
  date,
  steps,
  activeEnergyKcal: null,
  sleepHours: null,
});

/**
 * The baseline the dashboard compares today against. Getting this wrong makes
 * every "above your average" line wrong, which is worse than showing nothing at
 * all -- a confident comparison is harder to doubt than a blank.
 */
describe('averageOf', () => {
  it('averages the days that have data', () => {
    const days = [day('2026-08-18', 8000), day('2026-08-19', 10000)];
    expect(averageOf(days, (d) => d.steps)).toBe(9000);
  });

  it('ignores days with no data rather than counting them as zero', () => {
    // Counting a missing day as 0 would halve the average and make an entirely
    // ordinary day look exceptional.
    const days = [day('2026-08-18', 8000), day('2026-08-19', null)];
    expect(averageOf(days, (d) => d.steps)).toBe(8000);
  });

  it('returns null when nothing was recorded', () => {
    expect(averageOf([day('2026-08-19', null)], (d) => d.steps)).toBeNull();
    expect(averageOf([], (d) => d.steps)).toBeNull();
  });

  /**
   * Today is usually partial -- at 9am you have a fraction of your steps.
   * Including it in its own baseline drags the average toward it and
   * understates the difference, so a genuinely quiet day reads as normal.
   */
  it('can exclude the last day, so today is not part of its own baseline', () => {
    const days = [day('2026-08-17', 10000), day('2026-08-18', 10000), day('2026-08-19', 1000)];

    expect(averageOf(days, (d) => d.steps)).toBe(7000);
    expect(averageOf(days, (d) => d.steps, { excludeLast: true })).toBe(10000);
  });

  it('returns null when excluding the last day leaves nothing', () => {
    expect(averageOf([day('2026-08-19', 5000)], (d) => d.steps, { excludeLast: true })).toBeNull();
  });
});
