import { eq } from 'drizzle-orm';
import { db } from '../client';
import { foods } from '../schema';
import { SEED_FOODS } from './foods';
import { SEED_INGREDIENTS } from './ingredients';

/**
 * Loads the shipped food database.
 *
 * Only touches rows with source = 'seed'. The user's own foods are never read,
 * updated or deleted here, which is what makes it safe to reseed on every app
 * upgrade: shipping corrected nutrition values must not be able to destroy
 * someone's own entries.
 *
 * Upserts rather than delete-then-insert, so a seed food that a user has logged
 * keeps its id and their history keeps pointing at something real.
 */
export async function seedFoodDatabase(): Promise<{
  inserted: number;
  updated: number;
  removed: number;
}> {
  const existing = await db.select({ id: foods.id }).from(foods).where(eq(foods.source, 'seed'));
  const existingIds = new Set(existing.map((row) => row.id));

  let inserted = 0;
  let updated = 0;

  // Prepared dishes and raw ingredients seed into the same table. They differ
  // in how they are used -- you log a dish, you build a recipe from ingredients
  // -- but both are foods with nutrition, and one table keeps search unified so
  // "paneer" finds both the raw block and paneer butter masala.
  const all = [...SEED_FOODS, ...SEED_INGREDIENTS];

  for (const food of all) {
    if (existingIds.has(food.id)) {
      // Refresh the nutrition, but leave createdAt alone so the row keeps its
      // original history.
      const { id, ...values } = food;
      await db.update(foods).set(values).where(eq(foods.id, id));
      updated += 1;
    } else {
      await db.insert(foods).values(food);
      inserted += 1;
    }
  }

  const removed = await removeStaleSeedFoods(new Set(all.map((food) => food.id)));

  return { inserted, updated, removed };
}

/**
 * Delete seed rows that a later release dropped from the manifest.
 *
 * Safe by design rather than by luck: `food_log_entries.food_id` and
 * `recipe_ingredients.food_id` are both ON DELETE SET NULL, and each of those
 * rows carries its own copy of the nutrition. So removing a food the app no
 * longer ships loses the link but never the history or a recipe total.
 *
 * Without this, renaming or relocating a seed food (as happened when paneer,
 * curd and ghee moved to the ingredients file) leaves the old row behind and
 * the user sees the same food twice in search.
 */
async function removeStaleSeedFoods(currentIds: Set<string>): Promise<number> {
  const existing = await db.select({ id: foods.id }).from(foods).where(eq(foods.source, 'seed'));
  const stale = existing.filter((row) => !currentIds.has(row.id));

  for (const row of stale) {
    await db.delete(foods).where(eq(foods.id, row.id));
  }

  return stale.length;
}

/** Whether the seed data has been loaded at least once. */
export async function isSeeded(): Promise<boolean> {
  const rows = await db
    .select({ id: foods.id })
    .from(foods)
    .where(eq(foods.source, 'seed'))
    .limit(1);
  return rows.length > 0;
}
