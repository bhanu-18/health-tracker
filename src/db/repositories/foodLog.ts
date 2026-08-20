import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { newId } from '../ids';
import { foodLogEntries, type FoodLogEntry, type MealSlot } from '../schema';

/**
 * Reads and writes for the food log.
 *
 * Thin by design: SQL in, typed rows out, no business logic. Nutrition maths
 * lives in src/lib/nutrition.ts so it can be tested without a database.
 */

export type LogMealInput = {
  date: string;
  slot: MealSlot;
  name: string;
  servings: number;
  /** Totals for the whole entry, already scaled by `servings`. */
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  /** Provenance, so the entry can be re-logged or traced back. */
  foodId?: string | null;
  recipeId?: string | null;
};

export async function logMeal(input: LogMealInput): Promise<FoodLogEntry> {
  const [row] = await db
    .insert(foodLogEntries)
    .values({
      id: newId(),
      date: input.date,
      slot: input.slot,
      name: input.name,
      servings: input.servings,
      calories: input.calories,
      proteinG: input.proteinG ?? 0,
      carbsG: input.carbsG ?? 0,
      fatG: input.fatG ?? 0,
      foodId: input.foodId ?? null,
      recipeId: input.recipeId ?? null,
    })
    .returning();

  if (!row) throw new Error('Failed to save the meal.');
  return row;
}

/** Every entry ever logged, oldest first. For export only. */
export async function getAllEntries(): Promise<FoodLogEntry[]> {
  return db.select().from(foodLogEntries).orderBy(foodLogEntries.date, foodLogEntries.loggedAt);
}

/** Everything logged on one day, oldest first so the list reads chronologically. */
export async function getEntriesForDate(date: string): Promise<FoodLogEntry[]> {
  return db
    .select()
    .from(foodLogEntries)
    .where(eq(foodLogEntries.date, date))
    .orderBy(foodLogEntries.loggedAt);
}

export async function deleteEntry(id: string): Promise<void> {
  await db.delete(foodLogEntries).where(eq(foodLogEntries.id, id));
}

export async function updateServings(id: string, servings: number): Promise<void> {
  // Nutrition is stored pre-scaled, so changing the portion has to rescale it.
  // Done in SQL rather than read-modify-write to avoid a lost update if two
  // edits overlap.
  const [current] = await db.select().from(foodLogEntries).where(eq(foodLogEntries.id, id));
  if (!current) return;
  if (current.servings === 0) return;

  const factor = servings / current.servings;
  await db
    .update(foodLogEntries)
    .set({
      servings,
      calories: Math.round(current.calories * factor),
      proteinG: Math.round(current.proteinG * factor * 10) / 10,
      carbsG: Math.round(current.carbsG * factor * 10) / 10,
      fatG: Math.round(current.fatG * factor * 10) / 10,
    })
    .where(eq(foodLogEntries.id, id));
}

/**
 * Daily calorie totals across a date range, for the history charts.
 *
 * Aggregated in SQL rather than by loading every entry and summing in
 * JavaScript -- a year of logging is thousands of rows, and shipping them all
 * into memory to add up four numbers is how a history screen becomes slow.
 */
export async function getDailyCalorieTotals(
  from: string,
  to: string,
): Promise<{ date: string; calories: number }[]> {
  return db
    .select({
      date: foodLogEntries.date,
      calories: sql<number>`cast(sum(${foodLogEntries.calories}) as int)`,
    })
    .from(foodLogEntries)
    .where(and(sql`${foodLogEntries.date} >= ${from}`, sql`${foodLogEntries.date} <= ${to}`))
    .groupBy(foodLogEntries.date)
    .orderBy(foodLogEntries.date);
}

/**
 * Foods logged most often, for suggesting additions to "your usual meals".
 * Grouped by name rather than foodId so hand-typed entries count too.
 */
export async function getMostLoggedFoods(
  limit = 10,
): Promise<
  { name: string; foodId: string | null; recipeId: string | null; timesLogged: number }[]
> {
  return db
    .select({
      name: foodLogEntries.name,
      foodId: foodLogEntries.foodId,
      recipeId: foodLogEntries.recipeId,
      timesLogged: sql<number>`count(*)`,
    })
    .from(foodLogEntries)
    .groupBy(foodLogEntries.name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}
