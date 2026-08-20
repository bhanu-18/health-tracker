import { render } from '@testing-library/react-native';
import React from 'react';
import { BarChart } from '../BarChart';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const gradient = ['#000000', '#FFFFFF'] as const;

/** Counts drawn bars. Rects carry a width prop; the goal line does not. */
const barCount = (json: unknown): number => (JSON.stringify(json).match(/"rx":/g) ?? []).length;

describe('BarChart', () => {
  it('says so when the range has no data at all', async () => {
    const { getByText } = await render(
      <BarChart bars={[{ value: null }, { value: null }]} gradient={gradient} id="t" />,
    );
    expect(getByText('No data for this range')).toBeTruthy();
  });

  it('draws one bar per day that has data', async () => {
    const { toJSON } = await render(
      <BarChart bars={[{ value: 3 }, { value: 5 }, { value: 4 }]} gradient={gradient} id="t" />,
    );
    expect(barCount(toJSON())).toBe(3);
  });

  /**
   * The distinction the whole health layer is built on. A zero-height bar
   * claims you took no steps; an absent bar says the day was not recorded.
   */
  it('leaves a gap for a missing day rather than drawing a zero bar', async () => {
    const { toJSON } = await render(
      <BarChart bars={[{ value: 3 }, { value: null }, { value: 4 }]} gradient={gradient} id="t" />,
    );
    expect(barCount(toJSON())).toBe(2);
  });

  it('does draw a bar for a genuine zero', async () => {
    // 0 steps is a real measurement and must still appear, as a minimal stub.
    const { toJSON } = await render(
      <BarChart bars={[{ value: 0 }, { value: 5 }]} gradient={gradient} id="t" />,
    );
    expect(barCount(toJSON())).toBe(2);
  });

  it('survives every value being zero without dividing by zero', async () => {
    const { toJSON } = await render(
      <BarChart bars={[{ value: 0 }, { value: 0 }]} gradient={gradient} id="t" />,
    );
    expect(JSON.stringify(toJSON())).not.toContain('NaN');
  });

  it('keeps bars visible across a long range', async () => {
    // 30 slots must not collapse the bars to nothing.
    const bars = Array.from({ length: 30 }, (_, i) => ({ value: i + 1 }));
    const { toJSON } = await render(<BarChart bars={bars} gradient={gradient} id="t" />);
    const widths = JSON.stringify(toJSON()).match(/"width":(\d+(\.\d+)?)/g) ?? [];
    const numeric = widths.map((w) => Number(w.split(':')[1]));
    expect(Math.min(...numeric)).toBeGreaterThanOrEqual(2);
  });
});
