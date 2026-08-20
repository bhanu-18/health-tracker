import { eq } from 'drizzle-orm';
import { db } from '../client';
import { foods } from '../schema';
import { SEED_FOODS } from './foods';

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
export async function seedFoodDatabase(): Promise<{ inserted: number; updated: number }> {
  const existing = await db.select({ id: foods.id }).from(foods).where(eq(foods.source, 'seed'));
  const existingIds = new Set(existing.map((row) => row.id));

  let inserted = 0;
  let updated = 0;

  for (const food of SEED_FOODS) {
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

  return { inserted, updated };
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
