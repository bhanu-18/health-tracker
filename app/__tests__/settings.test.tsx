import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import SettingsScreen from '../settings';

/**
 * The calorie target drives the dashboard's headline number, so a value that
 * fails to save is not a settings bug -- it makes every "calories remaining"
 * figure wrong, quietly, for as long as it goes unnoticed.
 */

// Typed with its parameter so the assertions below can read mock.calls[0][0].
const mockUpdate = jest.fn(async (_changes: Record<string, unknown>) => undefined);
let mockWeightUnit: 'kg' | 'lb' = 'kg';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/services/health', () => ({
  getHealthProvider: () => ({ name: 'Apple Health' }),
  isUsingMockHealthData: () => false,
}));

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
  mockUpdate.mockClear();
  mockWeightUnit = 'kg';
});

describe('SettingsScreen', () => {
  it('shows the stored goals', async () => {
    const { getByLabelText } = await render(<SettingsScreen />);
    expect(getByLabelText('Daily calories').props.value).toBe('2000');
    expect(getByLabelText('Daily steps').props.value).toBe('10000');
  });

  it('saves an edited calorie target', async () => {
    const { getByLabelText, getByText } = await render(<SettingsScreen />);

    fireEvent.changeText(getByLabelText('Daily calories'), '1800');
    await waitFor(() => expect(getByLabelText('Daily calories').props.value).toBe('1800'));

    fireEvent.press(getByText('Save goals'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0]![0]).toMatchObject({ dailyCalorieTarget: 1800 });
  });

  it('rejects a target of zero rather than saving it', async () => {
    const { getByLabelText, getByText } = await render(<SettingsScreen />);

    fireEvent.changeText(getByLabelText('Daily calories'), '0');
    await waitFor(() => expect(getByLabelText('Daily calories').props.value).toBe('0'));

    fireEvent.press(getByText('Save goals'));

    await waitFor(() => expect(getByText(/Enter a daily calorie target/)).toBeTruthy());
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // Storage is kilograms everywhere; pounds exist only at the display edge.
  it('converts a goal weight entered in pounds back to kilograms', async () => {
    mockWeightUnit = 'lb';
    const { getByLabelText, getByText } = await render(<SettingsScreen />);

    // 75 kg shows as 165.3 lb.
    expect(getByLabelText('Goal weight').props.value).toBe('165.3');

    fireEvent.changeText(getByLabelText('Goal weight'), '170');
    await waitFor(() => expect(getByLabelText('Goal weight').props.value).toBe('170'));

    fireEvent.press(getByText('Save goals'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    // 170 lb is 77.1 kg -- emphatically not 170.
    expect(mockUpdate.mock.calls[0]![0].goalWeightKg).toBeCloseTo(77.11, 1);
  });

  it('clears the goal weight when the field is emptied', async () => {
    const { getByLabelText, getByText } = await render(<SettingsScreen />);

    fireEvent.changeText(getByLabelText('Goal weight'), '');
    await waitFor(() => expect(getByLabelText('Goal weight').props.value).toBe(''));

    fireEvent.press(getByText('Save goals'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0]![0].goalWeightKg).toBeNull();
  });

  it('confirms a successful save', async () => {
    const { getByLabelText, getByText } = await render(<SettingsScreen />);

    fireEvent.changeText(getByLabelText('Daily calories'), '2100');
    await waitFor(() => expect(getByLabelText('Daily calories').props.value).toBe('2100'));

    fireEvent.press(getByText('Save goals'));

    await waitFor(() => expect(getByText('Goals saved')).toBeTruthy());
  });

  /**
   * The bug the toast replaced: the old message never cleared, so "Saved" kept
   * sitting above fields that had since been edited and not saved -- not merely
   * stale, but wrong about the current state.
   */
  it('clears the confirmation as soon as a field is edited again', async () => {
    const { getByLabelText, getByText, queryByText } = await render(<SettingsScreen />);

    fireEvent.changeText(getByLabelText('Daily calories'), '2100');
    await waitFor(() => expect(getByLabelText('Daily calories').props.value).toBe('2100'));
    fireEvent.press(getByText('Save goals'));
    await waitFor(() => expect(getByText('Goals saved')).toBeTruthy());

    fireEvent.changeText(getByLabelText('Daily calories'), '2200');

    await waitFor(() => expect(queryByText('Goals saved')).toBeNull());
  });

  it('changes only the display unit, touching no stored weight', async () => {
    const { getByLabelText } = await render(<SettingsScreen />);

    fireEvent.press(getByLabelText('Show weight in lb'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ weightUnit: 'lb' }));
    // Nothing else is written: the stored kilograms are untouched.
    expect(Object.keys(mockUpdate.mock.calls[0]![0])).toEqual(['weightUnit']);
  });
});
