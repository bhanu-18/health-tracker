import { render } from '@testing-library/react-native';
import React from 'react';
import { Sparkline } from '../Sparkline';

const gradient = ['#000000', '#FFFFFF'] as const;

/** Counts the drawn path segments, which is what the line actually is. */
const pathCount = (json: unknown): number => JSON.stringify(json).split('"d":').length - 1;

describe('Sparkline', () => {
  it('draws nothing for a single data point', async () => {
    const { toJSON } = await render(<Sparkline values={[5]} gradient={gradient} />);
    expect(pathCount(toJSON())).toBe(0);
  });

  /**
   * Two points draw a straight diagonal that reads as a stray mark rather than
   * a trend -- it looked like a rendering artefact on the dashboard.
   */
  it('draws nothing for two data points', async () => {
    const { toJSON } = await render(<Sparkline values={[5, 8]} gradient={gradient} />);
    expect(pathCount(toJSON())).toBe(0);
  });

  it('draws a line once there are three points', async () => {
    const { toJSON } = await render(<Sparkline values={[5, 8, 6]} gradient={gradient} />);
    expect(pathCount(toJSON())).toBe(1);
  });

  it('counts only the days that have data toward the minimum', async () => {
    const { toJSON } = await render(<Sparkline values={[5, null, 8, null]} gradient={gradient} />);
    expect(pathCount(toJSON())).toBe(0);
  });

  /**
   * Missing days break the line rather than being interpolated: a smooth line
   * through a day the watch was not worn is a claim about data that does not
   * exist.
   */
  it('breaks the line at a missing day rather than bridging it', async () => {
    const { toJSON } = await render(<Sparkline values={[5, 8, null, 6, 7]} gradient={gradient} />);
    const d = JSON.stringify(toJSON());
    // A second "M" starts a new segment after the gap.
    const moveCommands = (d.match(/M /g) ?? []).length;
    expect(moveCommands).toBe(2);
  });

  it('survives a flat series without dividing by zero', async () => {
    const { toJSON } = await render(<Sparkline values={[5, 5, 5]} gradient={gradient} />);
    const d = JSON.stringify(toJSON());
    expect(d).not.toContain('NaN');
  });
});
