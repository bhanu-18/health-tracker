import { useCallback, useEffect, useState } from 'react';
import { getDailyCalorieTotals } from '../db/repositories/foodLog';
import { getAllWeightEntries } from '../db/repositories/weight';
import type { WeightEntryRow } from '../db/schema';
import { addDays, dateRange } from '../lib/dates';
import {
  getHealthProvider,
  type DailyHealthMetrics,
  type ISODate,
  type WorkoutSession,
} from '../services/health';

export type HistoryRange = 'week' | 'month';

export const RANGE_DAYS: Record<HistoryRange, number> = { week: 7, month: 30 };

export type HistoryData = {
  /** One entry per day in the range, oldest first, gaps included as nulls. */
  days: {
    date: ISODate;
    steps: number | null;
    sleepHours: number | null;
    activeEnergyKcal: number | null;
    caloriesEaten: number | null;
    weightKg: number | null;
  }[];
  workouts: WorkoutSession[];
  isLoading: boolean;
};

/**
 * Everything the history screen plots, aligned to one continuous date axis.
 *
 * The alignment matters: health metrics, food logs and weights come from three
 * different sources with three different sets of gaps. Plotting each against
 * its own list of days would put Tuesday in a different horizontal position on
 * each chart, so the charts could not be read against one another.
 */
export function useHistory(endDate: ISODate, range: HistoryRange): HistoryData {
  const [state, setState] = useState<HistoryData>({
    days: [],
    workouts: [],
    isLoading: true,
  });

  const load = useCallback(async () => {
    const days = RANGE_DAYS[range];
    const from = addDays(endDate, -(days - 1));

    const [metrics, calories, weights, workouts] = await Promise.all([
      getHealthProvider()
        .readDailyMetricsRange(from, endDate)
        .catch(() => [] as DailyHealthMetrics[]),
      getDailyCalorieTotals(from, endDate).catch(() => []),
      getAllWeightEntries().catch(() => [] as WeightEntryRow[]),
      getHealthProvider()
        .readWorkouts(from, endDate)
        .catch(() => [] as WorkoutSession[]),
    ]);

    // Indexed by date so the merge below is a lookup rather than a scan per day.
    const metricsByDate = new Map(metrics.map((m) => [m.date, m]));
    const caloriesByDate = new Map(calories.map((c) => [c.date, c.calories]));
    const weightByDate = new Map(weights.map((w) => [w.date, w.kg]));

    setState({
      days: dateRange(from, endDate).map((date) => ({
        date,
        steps: metricsByDate.get(date)?.steps ?? null,
        sleepHours: metricsByDate.get(date)?.sleepHours ?? null,
        activeEnergyKcal: metricsByDate.get(date)?.activeEnergyKcal ?? null,
        // Null rather than 0 for a day with nothing logged: "did not log" and
        // "ate nothing" are different claims, and only one of them is credible.
        caloriesEaten: caloriesByDate.get(date) ?? null,
        weightKg: weightByDate.get(date) ?? null,
      })),
      workouts,
      isLoading: false,
    });
  }, [endDate, range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see useDailyHealth
    void load();
  }, [load]);

  return state;
}

/** Sum of the days that have data, or null when none do. */
export function totalOf(
  days: readonly HistoryData['days'][number][],
  pick: (day: HistoryData['days'][number]) => number | null,
): number | null {
  const values = days.map(pick).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0);
}

/** Mean of the days that have data, or null when none do. */
export function meanOf(
  days: readonly HistoryData['days'][number][],
  pick: (day: HistoryData['days'][number]) => number | null,
): number | null {
  const values = days.map(pick).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
