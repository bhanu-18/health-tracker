import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { newId } from '../ids';
import { foods, recipes, usualMeals, type MealSlot, type UsualMeal } from '../schema';

/**
 * "Your usual meals" -- the one-tap re-log list.
 *
 * Distinct from "recent foods" on purpose: this list is curated by the user and
 * persists, because the habit being supported is eating a repeating rotation of
 * home-cooked dishes. A recents list would churn every time you ate something
 * unusual, which is exactly when it is least useful.
 */

export type UsualMealWithFood = UsualMeal & {
  /** Resolved display name: the label if set, otherwise the food or recipe name. */
  displayName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/**
 * The usual list, most-used first.
 *
 * Joined in SQL rather than fetched per row: a list of ten entries would
 * otherwise be eleven round trips, and the nutrition has to come from the food
 * or recipe anyway so the caller can log without a second query.
 */
export async function getUsualMeals(): Promise<UsualMealWithFood[]> {
  const rows = await db
    .select({
      usual: usualMeals,
      foodName: foods.name,
      foodCalories: foods.calories,
      foodProtein: foods.proteinG,
      foodCarbs: foods.carbsG,
      foodFat: foods.fatG,
      recipeName: recipes.name,
      recipeCalories: recipes.caloriesPerServing,
      recipeProtein: recipes.proteinPerServingG,
      recipeCarbs: recipes.carbsPerServingG,
      recipeFat: recipes.fatPerServingG,
    })
    .from(usualMeals)
    .leftJoin(foods, eq(usualMeals.foodId, foods.id))
    .leftJoin(recipes, eq(usualMeals.recipeId, recipes.id))
    .orderBy(desc(usualMeals.useCount), desc(usualMeals.lastUsedAt));

  return rows.map((row) => {
    const name = row.usual.label ?? row.foodName ?? row.recipeName ?? 'Unknown';
    return {
      ...row.usual,
      displayName: name,
      // Per-serving values; the caller scales by `servings` when logging.
      calories: row.foodCalories ?? row.recipeCalories ?? 0,
      proteinG: row.foodProtein ?? row.recipeProtein ?? 0,
      carbsG: row.foodCarbs ?? row.recipeCarbs ?? 0,
      fatG: row.foodFat ?? row.recipeFat ?? 0,
    };
  });
}

export type AddUsualMealInput = {
  foodId?: string | null;
  recipeId?: string | null;
  label?: string | null;
  servings?: number;
  slot?: MealSlot | null;
};

export async function addUsualMeal(input: AddUsualMealInput): Promise<void> {
  await db
    .insert(usualMeals)
    .values({
      id: newId(),
      foodId: input.foodId ?? null,
      recipeId: input.recipeId ?? null,
      label: input.label ?? null,
      servings: input.servings ?? 1,
      slot: input.slot ?? null,
    })
    // The unique indexes on foodId/recipeId make a repeat "save as usual" a
    // no-op rather than an error, so tapping it twice is harmless.
    .onConflictDoNothing();
}

export async function removeUsualMeal(id: string): Promise<void> {
  await db.delete(usualMeals).where(eq(usualMeals.id, id));
}

/**
 * Bump usage so the list orders itself by what is genuinely eaten most.
 *
 * The timestamp comes from SQLite rather than the caller, matching how every
 * other timestamp in the schema is defaulted. That keeps one clock as the
 * authority -- and keeps the callers pure, since reading Date.now() inside a
 * component is exactly what the react-hooks/purity rule exists to prevent.
 */
export async function recordUsualMealUse(id: string): Promise<void> {
  await db
    .update(usualMeals)
    .set({
      useCount: sql`${usualMeals.useCount} + 1`,
      lastUsedAt: sql`(unixepoch() * 1000)`,
    })
    .where(eq(usualMeals.id, id));
}

/** Whether a food is already saved as usual, for toggling the UI affordance. */
export async function isFoodSavedAsUsual(foodId: string): Promise<boolean> {
  const rows = await db
    .select({ id: usualMeals.id })
    .from(usualMeals)
    .where(eq(usualMeals.foodId, foodId))
    .limit(1);
  return rows.length > 0;
}
