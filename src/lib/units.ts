/**
 * Weight unit conversion and formatting.
 *
 * Storage is always kilograms -- see the note in db/schema.ts. This module is
 * the only place pounds exist, and it sits at the display edge: values are
 * converted on the way to the screen and on the way back from an input, never
 * in between.
 *
 * The reason for that discipline: if some rows were stored in pounds, every
 * average, delta and chart would need to know each row's unit, and one place
 * that forgot would produce a number wrong by a factor of 2.2 that still looks
 * plausible.
 */

export type WeightUnit = 'kg' | 'lb';

/** Exact by definition: one pound is 0.45359237 kg. */
const KG_PER_LB = 0.45359237;

export const lbToKg = (lb: number): number => lb * KG_PER_LB;
export const kgToLb = (kg: number): number => kg / KG_PER_LB;

/** Convert a stored kilogram value into the unit the user reads. */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kgToLb(kg);
}

/** Convert a value the user typed, in their unit, into kilograms for storage. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : lbToKg(value);
}

/**
 * Format a weight for display, to one decimal.
 *
 * One decimal is deliberate in both units: bathroom scales report to 0.1, and
 * showing more implies a precision the measurement does not have.
 */
export function formatWeight(kg: number, unit: WeightUnit): string {
  const value = fromKg(kg, unit);
  return `${value.toFixed(1)} ${unit}`;
}

/**
 * Format a change in weight, with an explicit sign.
 *
 * A delta is a difference, so it converts as a ratio -- no offset is involved.
 * That is trivially true for mass, but stating it matters because the same
 * function shape applied to temperature would be wrong.
 */
export function formatWeightDelta(deltaKg: number | null, unit: WeightUnit): string {
  if (deltaKg == null) return 'Not enough data yet';

  const value = fromKg(deltaKg, unit);
  const rounded = Math.round(value * 10) / 10;

  if (rounded === 0) return 'No change';
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)} ${unit}`;
}

/**
 * A sensible starting value for the entry field.
 *
 * Defaulting to the last reading means most entries are a small adjustment
 * rather than typing a full number, which is the difference between logging
 * daily and giving up after a week.
 */
export function defaultEntryValue(lastKg: number | null, unit: WeightUnit): string {
  if (lastKg == null) return '';
  return fromKg(lastKg, unit).toFixed(1);
}
