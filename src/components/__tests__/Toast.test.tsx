import { act, render } from '@testing-library/react-native';
import React from 'react';
import { Toast } from '../Toast';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Toast', () => {
  it('shows nothing when there is no message', async () => {
    const { queryByText } = await render(<Toast message={null} onDismiss={jest.fn()} />);
    expect(queryByText(/./)).toBeNull();
  });

  it('shows the message', async () => {
    const { getByText } = await render(<Toast message="Goals saved" onDismiss={jest.fn()} />);
    expect(getByText('Goals saved')).toBeTruthy();
  });

  /**
   * The point of the component. The message it replaced never cleared, so it
   * kept describing a save from minutes earlier -- over fields that had since
   * been edited.
   */
  it('dismisses itself after its duration', async () => {
    const onDismiss = jest.fn();
    await render(<Toast message="Goals saved" onDismiss={onDismiss} durationMs={2000} />);

    expect(onDismiss).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(2000);
      // Let the fade-out animation and its completion callback run.
      jest.advanceTimersByTime(500);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss early', async () => {
    const onDismiss = jest.fn();
    await render(<Toast message="Goals saved" onDismiss={onDismiss} durationMs={3000} />);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  // A failure has to be read; a confirmation only has to be glimpsed.
  it('leaves an error up longer than a confirmation', async () => {
    const onDismiss = jest.fn();
    await render(<Toast message="Could not save" tone="error" onDismiss={onDismiss} />);

    await act(async () => {
      // Past the success duration of 2.5s, well short of the error's 5s.
      jest.advanceTimersByTime(3000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('clears its timer when unmounted, so a gone screen cannot be updated', async () => {
    const onDismiss = jest.fn();
    const { unmount } = await render(
      <Toast message="Goals saved" onDismiss={onDismiss} durationMs={1000} />,
    );

    await unmount();

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
