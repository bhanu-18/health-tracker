import type { FoodLogEntry, WeightEntryRow } from '../../db/schema';
import { buildFullExport, buildWeightCsv, csvEscape, toCsv } from '../export';

const entry = (over: Partial<FoodLogEntry> = {}): FoodLogEntry =>
  ({
    id: '1',
    date: '2026-08-20',
    slot: 'lunch',
    name: 'Chana masala',
    servings: 1,
    calories: 310,
    proteinG: 12,
    carbsG: 40,
    fatG: 9,
    foodId: null,
    recipeId: null,
    loggedAt: 1,
    ...over,
  }) as FoodLogEntry;

describe('csvEscape', () => {
  it('leaves plain values alone', () => {
    expect(csvEscape('Idli')).toBe('Idli');
    expect(csvEscape(310)).toBe('310');
  });

  /**
   * The failure that silently corrupts an export: a food name containing a
   * comma shifts every later column, and the file looks fine until read.
   */
  it('quotes a value containing a comma', () => {
    expect(csvEscape('Curd (dahi), whole milk')).toBe('"Curd (dahi), whole milk"');
  });

  it('doubles embedded quotes', () => {
    expect(csvEscape('He said "hi"')).toBe('"He said ""hi"""');
  });

  it('quotes values containing newlines', () => {
    expect(csvEscape('two\nlines')).toBe('"two\nlines"');
  });

  it('writes null and undefined as empty', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });
});

describe('toCsv', () => {
  it('joins cells and rows', () => {
    expect(
      toCsv([
        ['a', 'b'],
        [1, 2],
      ]),
    ).toBe('a,b\n1,2');
  });
});

describe('buildFullExport', () => {
  const weights: WeightEntryRow[] = [
    {
      id: 'w1',
      date: '2026-08-20',
      kg: 82.5,
      source: 'manual',
      externalId: null,
      loggedAt: 1,
    } as WeightEntryRow,
  ];

  it('includes both tables and a count', () => {
    const csv = buildFullExport([entry()], weights, '2026-08-20');
    expect(csv).toContain('# FOOD LOG');
    expect(csv).toContain('# WEIGHT');
    expect(csv).toContain('1 food entries, 1 weight entries');
    expect(csv).toContain('Chana masala');
    expect(csv).toContain('82.5');
  });

  it('escapes a food name with a comma so columns do not shift', () => {
    const csv = buildFullExport([entry({ name: 'Curd (dahi), whole milk' })], [], '2026-08-20');
    const row = csv.split('\n').find((line) => line.includes('Curd')) ?? '';
    // Eight columns, and the comma inside the name must not add a ninth.
    expect(row.split(',').length).toBeGreaterThan(8);
    expect(row).toContain('"Curd (dahi), whole milk"');
  });

  it('produces a header even with nothing logged', () => {
    const csv = buildFullExport([], [], '2026-08-20');
    expect(csv).toContain('0 food entries, 0 weight entries');
    expect(csv).toContain('date,meal,food');
  });

  it('exports weight in kilograms regardless of display preference', () => {
    // The file must not depend on a setting at the moment it was produced.
    expect(buildWeightCsv(weights)).toContain('82.5');
  });
});
