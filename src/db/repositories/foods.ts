import { asc, eq, like, or, sql } from 'drizzle-orm';
import { normalizeName, type SearchFilters } from '../../lib/foodSearch';
import { db } from '../client';
import { newId } from '../ids';
import { foods, type Food, type NewFood } from '../schema';

/**
 * Food library reads and writes.
 *
 * Search narrows in SQL first and ranks in JavaScript afterwards. The database
 * is good at "which rows could possibly match" using an index; the ranking
 * rules in src/lib/foodSearch.ts are easier to read, test and tune as plain
 * functions than as a pile of CASE expressions.
 */

export async function getAllFoods(): Promise<Food[]> {
  return db.select().from(foods).orderBy(asc(foods.name));
}

export async function getFoodById(id: string): Promise<Food | undefined> {
  const [row] = await db.select().from(foods).where(eq(foods.id, id));
  return row;
}

/**
 * Candidate rows for a query, before ranking.
 *
 * Each query word is matched separately with LIKE so "masala chana" still finds
 * "Chana masala" -- a single LIKE on the whole string would require the words in
 * order. Narrowing here keeps the set small enough that ranking every candidate
 * in JavaScript stays cheap.
 */
export async function findFoodCandidates(query: string, limit = 200): Promise<Food[]> {
  const normalized = normalizeName(query);
  const words = normalized.split(' ').filter(Boolean);

  if (words.length === 0) {
    return db.select().from(foods).orderBy(asc(foods.name)).limit(limit);
  }

  const clauses = words.map((word) => like(foods.nameNormalized, `%${word}%`));

  return db
    .select()
    .from(foods)
    .where(clauses.length === 1 ? clauses[0] : or(...clauses))
    .limit(limit);
}

/**
 * Apply nutrient ranges in SQL.
 *
 * Used when browsing with filters and no query, where the candidate set would
 * otherwise be the entire table.
 */
export async function findFoodsByNutrients(filters: SearchFilters, limit = 200): Promise<Food[]> {
  const conditions = [
    filters.calories?.min != null ? sql`${foods.calories} >= ${filters.calories.min}` : null,
    filters.calories?.max != null ? sql`${foods.calories} <= ${filters.calories.max}` : null,
    filters.proteinG?.min != null ? sql`${foods.proteinG} >= ${filters.proteinG.min}` : null,
    filters.proteinG?.max != null ? sql`${foods.proteinG} <= ${filters.proteinG.max}` : null,
    filters.carbsG?.min != null ? sql`${foods.carbsG} >= ${filters.carbsG.min}` : null,
    filters.carbsG?.max != null ? sql`${foods.carbsG} <= ${filters.carbsG.max}` : null,
    filters.fatG?.min != null ? sql`${foods.fatG} >= ${filters.fatG.min}` : null,
    filters.fatG?.max != null ? sql`${foods.fatG} <= ${filters.fatG.max}` : null,
  ].filter((clause) => clause != null);

  const query = db.select().from(foods);
  if (conditions.length === 0) return query.orderBy(asc(foods.name)).limit(limit);

  return query
    .where(sql.join(conditions, sql` and `))
    .orderBy(asc(foods.name))
    .limit(limit);
}

export type CreateFoodInput = Omit<NewFood, 'id' | 'nameNormalized' | 'source'>;

/** Add a user's own food. Always source 'user', so a reseed cannot remove it. */
export async function createFood(input: CreateFoodInput): Promise<Food> {
  const [row] = await db
    .insert(foods)
    .values({
      ...input,
      id: newId(),
      nameNormalized: normalizeName(input.name),
      source: 'user',
    })
    .returning();

  if (!row) throw new Error('Failed to save the food.');
  return row;
}

export async function updateFood(id: string, changes: Partial<CreateFoodInput>): Promise<void> {
  await db
    .update(foods)
    .set({
      ...changes,
      // Keep the search key in step with the name, or the food becomes
      // unfindable under its new spelling.
      ...(changes.name ? { nameNormalized: normalizeName(changes.name) } : {}),
    })
    .where(eq(foods.id, id));
}

export async function deleteFood(id: string): Promise<void> {
  await db.delete(foods).where(eq(foods.id, id));
}
