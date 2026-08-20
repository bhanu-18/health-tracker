import { useCallback, useEffect, useState } from 'react';
import { getHealthProvider, type ISODate, type WorkoutSession } from '../services/health';

/**
 * Workout sessions recorded on one day.
 *
 * IMPORTANT: their energy must never be added to the day's calorie balance.
 * HealthKit's activeEnergyBurned already includes energy from workouts, so
 * counting a session's kcal on top would credit the same run twice and inflate
 * what the dashboard says you may eat. These are shown to say what happened,
 * not to contribute to the arithmetic.
 */
export function useDayWorkouts(date: ISODate): {
  workouts: WorkoutSession[];
  isLoading: boolean;
  refresh: () => void;
} {
  const [state, setState] = useState<{ workouts: WorkoutSession[]; isLoading: boolean }>({
    workouts: [],
    isLoading: true,
  });

  const load = useCallback(async () => {
    try {
      const workouts = await getHealthProvider().readWorkouts(date, date);
      setState({ workouts, isLoading: false });
    } catch (cause) {
      // A failed workout read costs a list, not the screen.
      console.warn('[health] workout read failed:', cause);
      setState({ workouts: [], isLoading: false });
    }
  }, [date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see useDailyHealth
    void load();
  }, [load]);

  return { ...state, refresh: load };
}
