import {
  defaultEntryValue,
  formatWeight,
  formatWeightDelta,
  fromKg,
  kgToLb,
  lbToKg,
  toKg,
} from '../units';

describe('conversion', () => {
  it('converts pounds to kilograms', () => {
    expect(lbToKg(181.9)).toBeCloseTo(82.51, 2);
  });

  it('converts kilograms to pounds', () => {
    expect(kgToLb(82.5)).toBeCloseTo(181.88, 2);
  });

  // The property that matters: a value the user types and reads back must be
  // the same number, or their weight appears to drift on its own.
  it('round-trips without drift', () => {
    for (const lb of [120, 150.5, 181.9, 220.4]) {
      expect(kgToLb(lbToKg(lb))).toBeCloseTo(lb, 6);
    }
  });

  it('leaves kilograms untouched', () => {
    expect(fromKg(82.5, 'kg')).toBe(82.5);
    expect(toKg(82.5, 'kg')).toBe(82.5);
  });
});

describe('formatWeight', () => {
  it('formats in the requested unit to one decimal', () => {
    expect(formatWeight(82.5, 'kg')).toBe('82.5 kg');
    expect(formatWeight(82.5, 'lb')).toBe('181.9 lb');
  });
});

describe('formatWeightDelta', () => {
  it('signs the direction explicitly', () => {
    expect(formatWeightDelta(-0.5, 'kg')).toBe('-0.5 kg');
    expect(formatWeightDelta(0.5, 'kg')).toBe('+0.5 kg');
  });

  it('converts a delta as a ratio, with no offset', () => {
    // 1 kg lost is 2.2 lb lost.
    expect(formatWeightDelta(-1, 'lb')).toBe('-2.2 lb');
  });

  it('describes the empty and flat cases in words', () => {
    expect(formatWeightDelta(null, 'kg')).toBe('Not enough data yet');
    expect(formatWeightDelta(0, 'lb')).toBe('No change');
  });

  it('treats a change too small to show as no change, rather than -0.0', () => {
    expect(formatWeightDelta(-0.01, 'kg')).toBe('No change');
  });
});

describe('defaultEntryValue', () => {
  it('prefills the last reading in the display unit', () => {
    expect(defaultEntryValue(82.5, 'kg')).toBe('82.5');
    expect(defaultEntryValue(82.5, 'lb')).toBe('181.9');
  });

  it('is empty when nothing has been logged', () => {
    expect(defaultEntryValue(null, 'kg')).toBe('');
  });
});
