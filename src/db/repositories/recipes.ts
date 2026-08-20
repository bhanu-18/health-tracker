import { asc, eq, sql } from 'drizzle-orm';
import { normalizeName } from '../../lib/foodSearch';
import { calculateRecipeTotals } from '../../lib/recipes';
import { db } from '../client';
import { newId } from '../ids';
import {
  recipeIngredients,
  recipes,
  type NewRecipeIngredient,
  type Recipe,
  type RecipeIngredient,
} from '../schema';

/**
 * Recipe reads and writes.
 *
 * Per-serving nutrition is cached on the recipe row and recalculated whenever
 * the ingredient list changes. Search filters by calories and macros, and
 * re-summing a join for every recipe on every keystroke is what makes a search
 * field feel sluggish.
 *
 * The invariant that matters: every mutation of `recipe_ingredients` must be
 * followed by recalculateTotals, or the cached figures drift from the
 * ingredients and the app starts lying quietly. Each writer below does this.
 */

export type RecipeWithIngredients = Recipe & {
  ingredients: RecipeIngredient[];
};

export async function getRecipes(): Promise<Recipe[]> {
  return db.select().from(recipes).orderBy(asc(recipes.name));
}

export async function getRecipe(id: string): Promise<RecipeWithIngredients | undefined> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
  if (!recipe) return undefined;

  const ingredients = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, id))
    .orderBy(asc(recipeIngredients.sortOrder));

  return { ...recipe, ingredients };
}

export type CreateRecipeInput = {
  name: string;
  serves: number;
  notes?: string | null;
  cuisine?: string | null;
};

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  const [row] = await db
    .insert(recipes)
    .values({
      id: newId(),
      name: input.name,
      nameNormalized: normalizeName(input.name),
      serves: Math.max(1, Math.round(input.serves)),
      notes: input.notes ?? null,
      cuisine: input.cuisine ?? null,
      source: 'user',
    })
    .returning();

  if (!row) throw new Error('Could not create the recipe.');
  return row;
}

export async function updateRecipe(id: string, changes: Partial<CreateRecipeInput>): Promise<void> {
  await db
    .update(recipes)
    .set({
      ...changes,
      ...(changes.name ? { nameNormalized: normalizeName(changes.name) } : {}),
      ...(changes.serves != null ? { serves: Math.max(1, Math.round(changes.serves)) } : {}),
      updatedAt: sql`(unixepoch() * 1000)`,
    })
    .where(eq(recipes.id, id));

  // Serving count feeds the per-serving figures, so they must be redone.
  if (changes.serves != null) await recalculateTotals(id);
}

export async function deleteRecipe(id: string): Promise<void> {
  // Ingredients cascade; log entries keep their copied nutrition and only lose
  // the recipeId reference, so history survives deleting a recipe.
  await db.delete(recipes).where(eq(recipes.id, id));
}

export type AddIngredientInput = Omit<NewRecipeIngredient, 'id' | 'recipeId' | 'sortOrder'> & {
  sortOrder?: number;
};

export async function addIngredient(recipeId: string, input: AddIngredientInput): Promise<void> {
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId));

  await db.insert(recipeIngredients).values({
    ...input,
    id: newId(),
    recipeId,
    // Appended at the end, preserving the order the cook entered them, which
    // is usually the order things go in the pot.
    sortOrder: input.sortOrder ?? existing[0]?.count ?? 0,
  });

  await recalculateTotals(recipeId);
}

export async function removeIngredient(id: string): Promise<void> {
  const [row] = await db
    .select({ recipeId: recipeIngredients.recipeId })
    .from(recipeIngredients)
    .where(eq(recipeIngredients.id, id));

  await db.delete(recipeIngredients).where(eq(recipeIngredients.id, id));

  if (row) await recalculateTotals(row.recipeId);
}

/**
 * Recompute and store the recipe's per-serving nutrition from its ingredients.
 *
 * Exported so a repair path exists: if cached totals are ever suspected of
 * having drifted, this is the single call that reconciles them.
 */
export async function recalculateTotals(recipeId: string): Promise<void> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
  if (!recipe) return;

  const ingredients = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId));

  const totals = calculateRecipeTotals(
    ingredients.map((row) => ({
      nutrition: {
        calories: row.calories,
        protein: row.proteinG,
        carbs: row.carbsG,
        fat: row.fatG,
      },
    })),
    recipe.serves,
  );

  await db
    .update(recipes)
    .set({
      caloriesPerServing: totals.perServing.calories,
      proteinPerServingG: totals.perServing.protein,
      carbsPerServingG: totals.perServing.carbs,
      fatPerServingG: totals.perServing.fat,
      updatedAt: sql`(unixepoch() * 1000)`,
    })
    .where(eq(recipes.id, recipeId));
}
