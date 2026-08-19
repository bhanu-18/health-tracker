import { useCallback, useEffect, useState } from 'react';
import { getHealthProvider, type DailyHealthMetrics, type ISODate } from '../services/health';

type State = {
  metrics: DailyHealthMetrics | null;
  isLoading: boolean;
  /** Set when the read itself failed, as opposed to succeeding with no data. */
  error: string | null;
};

/**
 * Loads one day's health metrics.
 *
 * Note the deliberate distinction between the two empty cases:
 *   - `error` set        -> the read failed; show a retry affordance.
 *   - metrics with nulls -> the read worked but the OS had nothing; show "--".
 * Conflating them would tell a user their watch is broken when they simply have
 * not walked yet today.
 */
export function useDailyHealth(date: ISODate): State & { refresh: () => void } {
  const [state, setState] = useState<State>({ metrics: null, isLoading: true, error: null });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const metrics = await getHealthProvider().readDailyMetrics(date);
      setState({ metrics, isLoading: false, error: null });
    } catch (cause) {
      setState({
        metrics: null,
        isLoading: false,
        error: cause instanceof Error ? cause.message : 'Could not read health data',
      });
    }
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    // The cancelled flag prevents a state update after unmount, which React
    // warns about and which leaks if the user leaves the screen mid-read.
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { ...state, refresh: load };
}
