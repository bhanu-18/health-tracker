import type { FoodLogEntry, WeightEntryRow } from '../db/schema';

/**
 * Export as CSV.
 *
 * There is no backup otherwise: everything lives in SQLite on the device, and
 * deleting the app takes months of logging with it. CSV rather than JSON
 * because the point is that the data outlives this app -- a spreadsheet opens
 * it, and so does anything you might migrate to.
 */

/**
 * Escape a value for CSV.
 *
 * Food names contain commas ("Curd (dahi), whole milk") and apostrophes, and an
 * unescaped comma silently shifts every later column -- corrupting the export
 * in a way that looks fine until someone tries to read it.
 */
export function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return '';
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  // Doubling the quote is the CSV convention for a literal quote.
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: readonly (readonly (string | number | null)[])[]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function buildFoodLogCsv(entries: readonly FoodLogEntry[]): string {
  return toCsv([
    ['date', 'meal', 'food', 'servings', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
    ...entries.map((entry) => [
      entry.date,
      entry.slot,
      entry.name,
      entry.servings,
      entry.calories,
      entry.proteinG,
      entry.carbsG,
      entry.fatG,
    ]),
  ]);
}

export function buildWeightCsv(entries: readonly WeightEntryRow[]): string {
  return toCsv([
    ['date', 'kg', 'source'],
    // Always kilograms, matching storage. Exporting the display unit would make
    // the file depend on a setting at the moment it was produced.
    ...entries.map((entry) => [entry.date, entry.kg, entry.source]),
  ]);
}

/**
 * One document containing both tables.
 *
 * Separated by a blank line and a header, which spreadsheets tolerate and a
 * human can read. Two files would be tidier but the share sheet takes one
 * payload, and a backup split across two shares is a backup people lose half
 * of.
 */
export function buildFullExport(
  entries: readonly FoodLogEntry[],
  weights: readonly WeightEntryRow[],
  exportedOn: string,
): string {
  return [
    `# Health Tracker export`,
    `# exported ${exportedOn}`,
    `# ${entries.length} food entries, ${weights.length} weight entries`,
    '',
    '# FOOD LOG',
    buildFoodLogCsv(entries),
    '',
    '# WEIGHT',
    buildWeightCsv(weights),
    '',
  ].join('\n');
}
