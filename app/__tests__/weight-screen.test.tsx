import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { logWeight } from '../../src/db/repositories/weight';
import WeightScreen from '../(tabs)/weight';

/**
 * Covers the part of this screen most likely to corrupt data silently: unit
 * conversion. A weight typed in pounds must reach the database in kilograms,
 * and a wrong conversion here produces a number that still looks plausible
 * while being off by a factor of 2.2.
 */

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Pin "today", so the seven-day trend windows are deterministic. Without this
// the fixtures drift out of the comparison window as real time passes and the
// test starts failing on a date that has nothing to do with the code.
jest.mock('../../src/lib/dates', () => ({
  ...jest.requireActual('../../src/lib/dates'),
  today: () => '2026-08-19',
}));

jest.mock('../../src/db/repositories/weight', () => ({
  getRecentWeightEntries: jest.fn(async () => [
    // Prior window (ages 7-13): 2026-08-06 .. 2026-08-12
    { id: 'w1', date: '2026-08-10', kg: 83.2, source: 'manual', externalId: null, loggedAt: 1 },
    // Current window (ages 0-6): 2026-08-13 .. 2026-08-19
    { id: 'w2', date: '2026-08-18', kg: 82.5, source: 'manual', externalId: null, loggedAt: 2 },
  ]),
  logWeight: jest.fn(async () => undefined),
}));

const mockUpdate = jest.fn();
// Mutable so a test can switch the display unit before rendering.
let mockWeightUnit: 'kg' | 'lb' = 'kg';

jest.mock('../../src/stores/profile', () => {
  const actual = jest.requireActual('../../src/stores/profile');
  return {
    ...actual,
    useProfile: (selector: (s: unknown) => unknown) =>
      selector({
        profile: {
          dailyCalorieTarget: 2000,
          dailyStepGoal: 10000,
          sleepGoalHours: 8,
          goalWeightKg: 75,
          weightUnit: mockWeightUnit,
        },
        isLoading: false,
        update: mockUpdate,
      }),
  };
});

beforeEach(() => {
  // Clear call history only. jest.clearAllMocks() here also disturbed the
  // repository mocks' queued async results between tests, which made later
  // tests render against no data.
  mockUpdate.mockClear();
  (logWeight as jest.Mock).mockClear();
  mockWeightUnit = 'kg';
});

describe('WeightScreen', () => {
  it('shows the latest reading and the weekly trend', async () => {
    const { getByText } = await render(<WeightScreen />);

    await waitFor(() => expect(getByText('82.5')).toBeTruthy());
    // 82.5 in the current window against 83.2 the week before.
    expect(getByText(/-0\.7 kg/)).toBeTruthy();
  });

  it('prefills the entry field with the last reading', async () => {
    const { getByLabelText } = await render(<WeightScreen />);
    await waitFor(() => expect(getByLabelText('Weight').props.value).toBe('82.5'));
  });

  it('stores a kilogram entry unchanged', async () => {
    const { getByLabelText, getByText } = await render(<WeightScreen />);
    await waitFor(() => expect(getByLabelText('Weight').props.value).toBe('82.5'));

    fireEvent.changeText(getByLabelText('Weight'), '81.4');
    // Render is async in @testing-library/react-native v14, so the state update
    // from changeText must land before the press reads it.
    await waitFor(() => expect(getByLabelText('Weight').props.value).toBe('81.4'));

    fireEvent.press(getByText('Save weight'));

    await waitFor(() => expect(logWeight).toHaveBeenCalled());
    expect((logWeight as jest.Mock).mock.calls[0]![1]).toBeCloseTo(81.4, 5);

    // Saving reloads the list and then clears the saving flag. Await the label
    // returning, so those updates land inside the test rather than after it.
    await waitFor(() => expect(getByText('Save weight')).toBeTruthy());
  });

  it('rejects a non-numeric entry instead of saving NaN', async () => {
    const { getByLabelText, getByText } = await render(<WeightScreen />);
    await waitFor(() => expect(getByLabelText('Weight').props.value).toBe('82.5'));

    fireEvent.changeText(getByLabelText('Weight'), 'abc');
    await waitFor(() => expect(getByLabelText('Weight').props.value).toBe('abc'));

    fireEvent.press(getByText('Save weight'));

    await waitFor(() => expect(getByText(/Enter a weight/)).toBeTruthy());
    expect(logWeight).not.toHaveBeenCalled();
    // Validation returns before saving, so nothing further is pending here.
  });

  // The silent-corruption case: a value typed in pounds must not reach the
  // database as kilograms. Off by 2.2x, and still plausible enough to go
  // unnoticed until months of history are wrong.
  it('converts a pounds entry to kilograms before storing', async () => {
    mockWeightUnit = 'lb';
    const { getByLabelText, getByText } = await render(<WeightScreen />);

    // 82.5 kg displays as 181.9 lb.
    await waitFor(() => expect(getByLabelText('Weight').props.value).toBe('181.9'));

    fireEvent.changeText(getByLabelText('Weight'), '180.0');
    await waitFor(() => expect(getByLabelText('Weight').props.value).toBe('180.0'));

    fireEvent.press(getByText('Save weight'));

    await waitFor(() => expect(logWeight).toHaveBeenCalled());
    // 180 lb is 81.65 kg -- emphatically not 180.
    expect((logWeight as jest.Mock).mock.calls[0]![1]).toBeCloseTo(81.6466, 3);

    await waitFor(() => expect(getByText('Save weight')).toBeTruthy());
  });

  it('offers to switch units', async () => {
    const { getByText } = await render(<WeightScreen />);
    await waitFor(() => expect(getByText('Show lb')).toBeTruthy());

    fireEvent.press(getByText('Show lb'));
    expect(mockUpdate).toHaveBeenCalledWith({ weightUnit: 'lb' });
    await waitFor(() => expect(getByText('Save weight')).toBeTruthy());
  });
});
