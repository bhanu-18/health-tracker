import { render } from '@testing-library/react-native';
import React from 'react';
import { SleepStages } from '../SleepStages';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('SleepStages', () => {
  it('shows each stage as hours and minutes', async () => {
    const { getByText } = await render(
      <SleepStages stages={{ deepHours: 1.25, coreHours: 3.5, remHours: 1.5, awakeHours: 0.25 }} />,
    );

    expect(getByText('1h 15m')).toBeTruthy();
    expect(getByText('3h 30m')).toBeTruthy();
    expect(getByText('15m')).toBeTruthy();
  });

  it('drops a whole hour cleanly rather than showing 0m', async () => {
    const { getByText } = await render(
      <SleepStages stages={{ deepHours: 2, coreHours: 0, remHours: 0, awakeHours: 0 }} />,
    );
    expect(getByText('2h')).toBeTruthy();
  });

  /**
   * A source that records no REM should not leave an empty legend row and an
   * invisible bar segment implying a stage that was measured as zero.
   */
  it('omits stages with no time recorded', async () => {
    const { queryByText } = await render(
      <SleepStages stages={{ deepHours: 1, coreHours: 4, remHours: 0, awakeHours: 0 }} />,
    );
    expect(queryByText('REM')).toBeNull();
    expect(queryByText('Awake')).toBeNull();
  });

  it('renders nothing when every stage is zero', async () => {
    const { toJSON } = await render(
      <SleepStages stages={{ deepHours: 0, coreHours: 0, remHours: 0, awakeHours: 0 }} />,
    );
    expect(toJSON()).toBeNull();
  });
});
