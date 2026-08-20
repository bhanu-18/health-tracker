import { useCallback, useEffect, useRef, useState } from 'react';
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

  /**
   * Guards every setState after an await. Two separate hazards:
   *
   *   1. Unmount -- the user leaves the screen while a read is in flight.
   *      Updating then warns in development and retains the component.
   *   2. Out-of-order responses -- the date changes, or refresh() is called
   *      twice, and a slower earlier read resolves *after* a faster later one,
   *      overwriting fresh data with stale data.
   *
   * A single incrementing token solves both: a response is only applied if its
   * token is still the current one.
   */
  const currentRequest = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const token = ++currentRequest.current;
    const isStale = () => !isMounted.current || token !== currentRequest.current;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const metrics = await getHealthProvider().readDailyMetrics(date);
      if (isStale()) return;
      setState({ metrics, isLoading: false, error: null });
    } catch (cause) {
      if (isStale()) return;
      setState({
        metrics: null,
        isLoading: false,
        error: cause instanceof Error ? cause.message : 'Could not read health data',
      });
    }
  }, [date]);

  useEffect(() => {
    // `load` is recreated when `date` changes, which is exactly when a refetch
    // is wanted. The token above makes any superseded response a no-op.
    //
    // react-hooks/set-state-in-effect is disabled deliberately. The rule exists
    // because setting state from an effect costs an extra render pass, but
    // fetching on mount unavoidably does so -- the data simply is not available
    // during render. The real fix is a data-fetching layer (React Query, or
    // Suspense with a cache) that owns the loading state outside the component;
    // that is worth adding when more than one screen reads health data, and is
    // premature while only this hook does.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { ...state, refresh: load };
}
