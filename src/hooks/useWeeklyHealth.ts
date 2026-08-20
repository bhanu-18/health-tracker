import { useCallback, useEffect, useState } from 'react';
import { addDays } from '../lib/dates';
import { getHealthProvider, type DailyHealthMetrics, type ISODate } from '../services/health';

export type WeeklyHealth = {
  /** Oldest first, ending on `date`. Nulls are days with no data. */
  days: DailyHealthMetrics[];
  isLoading: boolean;
};

/**
 * The last seven days of metrics, for the dashboard's trend lines.
 *
 * Separate from useDailyHealth rather than folded into it: today's figures are
 * the headline and should not wait on a week of history, and the two have very
 * different refresh needs.
 */
export function useWeeklyHealth(date: ISODate, days = 7): WeeklyHealth {
  const [state, setState] = useState<WeeklyHealth>({ days: [], isLoading: true });

  const load = useCallback(async () => {
    try {
      const from = addDays(date, -(days - 1));
      const rows = await getHealthProvider().readDailyMetricsRange(from, date);
      setState({ days: rows, isLoading: false });
    } catch (cause) {
      // A failed range read costs a sparkline, not the screen. The headline
      // figures come from a separate query and are unaffected.
      console.warn('[health] weekly read failed:', cause);
      setState({ days: [], isLoading: false });
    }
  }, [date, days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see useDailyHealth
    void load();
  }, [load]);

  return state;
}

/**
 * Average of a metric across the days that have data.
 *
 * Returns null when nothing was recorded, so the caller can say "no data"
 * rather than "0" -- the distinction the whole health layer is built on.
 */
export function averageOf(
  days: readonly DailyHealthMetrics[],
  pick: (day: DailyHealthMetrics) => number | null,
  { excludeLast = false }: { excludeLast?: boolean } = {},
): number | null {
  // Today is usually partial, so comparing it against an average that includes
  // it drags the comparison toward itself and understates the difference.
  const considered = excludeLast ? days.slice(0, -1) : days;
  const values = considered.map(pick).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
