import { render } from '@testing-library/react-native';
import React from 'react';
import type { WorkoutSession } from '../../services/health';
import { WorkoutRow, formatDuration } from '../WorkoutRow';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const workout = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'w1',
  activityType: 'Running',
  startedAt: new Date('2026-08-20T07:15:00'),
  durationMinutes: 32,
  energyKcal: 288,
  sourceName: 'Fitbit',
  ...over,
});

describe('formatDuration', () => {
  it('uses minutes below an hour and hours above', () => {
    expect(formatDuration(32)).toBe('32 min');
    expect(formatDuration(59)).toBe('59 min');
    expect(formatDuration(60)).toBe('1h 0m');
    expect(formatDuration(95)).toBe('1h 35m');
  });
});

describe('WorkoutRow', () => {
  it('shows the activity, duration and energy', async () => {
    const { getByText } = await render(<WorkoutRow workout={workout()} />);
    expect(getByText('Running')).toBeTruthy();
    expect(getByText(/32 min/)).toBeTruthy();
    expect(getByText('288')).toBeTruthy();
  });

  /**
   * The OS does not reconcile workout sessions across sources, so the same run
   * can appear twice. Naming the source is what lets someone recognise a
   * duplicate instead of believing they trained twice.
   */
  it('always names the source', async () => {
    const { getByText } = await render(<WorkoutRow workout={workout()} />);
    expect(getByText(/Fitbit/)).toBeTruthy();
  });

  it('omits energy rather than showing zero when it was not recorded', async () => {
    const { queryByText } = await render(<WorkoutRow workout={workout({ energyKcal: null })} />);
    expect(queryByText('kcal')).toBeNull();
    expect(queryByText('0')).toBeNull();
  });

  it('shows a date instead of a time when the list spans days', async () => {
    const { getByText } = await render(<WorkoutRow workout={workout()} showDate />);
    expect(getByText(/20 Aug|Aug 20/)).toBeTruthy();
  });
});
