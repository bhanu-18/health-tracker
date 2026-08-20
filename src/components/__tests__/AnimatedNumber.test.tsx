// This file tests the real component, so it opts out of the global stub in
// jest.setup.ts that renders the final value immediately.
import { act, render } from '@testing-library/react-native';
import React from 'react';
import { AnimatedNumber } from '../AnimatedNumber';

jest.unmock('../AnimatedNumber');

/**
 * Tested here directly, and stubbed in screen tests.
 *
 * Screen tests assert what a screen shows; a number that takes 900ms to arrive
 * races waitFor's one-second default and fails on a slow machine while passing
 * on a fast one. That flake reached CI once. The behaviour still needs
 * covering, so it is covered in one place with control of the clock.
 */

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AnimatedNumber', () => {
  it('lands on its target value', async () => {
    const { getByText } = await render(<AnimatedNumber value={310} durationMs={500} />);

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(getByText('310')).toBeTruthy();
  });

  it('applies the format function', async () => {
    const { getByText } = await render(
      <AnimatedNumber value={2200} durationMs={500} format={(v) => v.toLocaleString()} />,
    );

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(getByText('2,200')).toBeTruthy();
  });

  /**
   * An interrupted animation must not leave a wrong number on screen. The
   * cleanup sets the exact target, so a screen that unmounts or re-renders
   * mid-count never freezes on a partial figure.
   */
  it('lands on the new target when the value changes mid-count', async () => {
    const { getByText, rerender } = await render(<AnimatedNumber value={500} durationMs={500} />);

    // Rerender first, then advance: doing both inside one act() left the new
    // animation unstarted when the clock jumped.
    await act(async () => {
      await rerender(<AnimatedNumber value={800} durationMs={500} />);
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    // An interrupted count must never leave a stale or partial figure on screen.
    expect(getByText('800')).toBeTruthy();
  });
});
