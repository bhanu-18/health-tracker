import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import TodayScreen from '../(tabs)/index';

/**
 * Regression test for an infinite render loop.
 *
 * The Today screen once selected from the Zustand store with
 * `useFoodLog((s) => s.entriesFor(date))`. That selector calls .filter(), so it
 * returned a brand new array on every invocation. Zustand compares selector
 * results with Object.is, read the new reference as a state change, re-rendered,
 * ran the selector again, and looped until React threw "Maximum update depth
 * exceeded" -- a blank red error screen on the device.
 *
 * Rendering the screen is the only way to catch that: types, lint and pure unit
 * tests all passed happily while the app was completely unusable. If someone
 * reintroduces a deriving selector, this fails instead of the phone.
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// Force the mock health provider so the test never reaches for native HealthKit.
jest.mock('../../src/services/health', () => {
  const { MockHealthProvider } = jest.requireActual('../../src/services/health/mock');
  const provider = new MockHealthProvider();
  return {
    getHealthProvider: () => provider,
    isUsingMockHealthData: () => true,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('TodayScreen', () => {
  it('renders without exceeding the maximum update depth', async () => {
    // A looping render rejects here, so reaching the assertion is the pass.
    // Note render() is async in @testing-library/react-native v14 -- without
    // the await you destructure a Promise and every query is undefined.
    const { getByText } = await render(<TodayScreen />);

    expect(getByText(/calories remaining|calories over budget/i)).toBeTruthy();

    // Let the async health read settle inside the test, so its state update is
    // not left to fire after teardown (which React warns about, and which would
    // mask genuine warnings later). The hero legend only says "burned" once
    // active-energy data has actually arrived, so it is a settle signal tied to
    // the read rather than to an arbitrary timeout.
    await waitFor(() => expect(getByText(/burned/i)).toBeTruthy());
  });

  it('shows the meals logged for today', async () => {
    const { getByText } = await render(<TodayScreen />);

    expect(getByText('Chana masala')).toBeTruthy();
    expect(getByText('Idli with sambar')).toBeTruthy();

    await waitFor(() => expect(getByText(/burned/i)).toBeTruthy());
  });
});
