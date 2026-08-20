import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Database schema.
 *
 * Two decisions shape everything below, and both are hard to reverse later:
 *
 * 1. LOGGED NUTRITION IS IMMUTABLE.
 *    A log entry copies the nutrition numbers in at the moment of logging
 *    rather than pointing at the food and reading through. If you later correct
 *    a recipe -- discover your chana masala is 340 kcal, not 310 -- every meal
 *    you already ate keeps the number you logged. Reading through a foreign key
 *    would silently rewrite months of history, which makes weight-versus-intake
 *    comparisons meaningless. The food id is still recorded, but only for
 *    provenance and re-logging.
 *
 * 2. ONE CANONICAL UNIT PER DIMENSION.
 *    Mass is grams, energy is kcal, weight is kilograms -- always, everywhere.
 *    Display units are a presentation concern handled at the edge. Storing
 *    whatever the user typed is how you end up with a database that needs a
 *    unit column checked at every read.
 */

/** ISO `YYYY-MM-DD` in the user's local timezone. Stored as text so it sorts. */
const isoDate = (name: string) => text(name).notNull();

/** Unix epoch milliseconds. */
const timestamp = (name: string) =>
  integer(name, { mode: 'number' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

/**
 * Atomic foods: a single ingredient or dish with known nutrition.
 *
 * Nutrition is stored per serving, not per 100 g, because that is how people
 * actually eat and log ("two rotis", not "84 grams of roti"). `servingGrams`
 * is kept so portions can still be scaled by weight when someone does know it.
 */
export const foods = sqliteTable(
  'foods',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),

    /**
     * Lowercased, accent- and punctuation-stripped name for searching.
     * Precomputed rather than normalised at query time so search can use an
     * index instead of scanning every row through a function.
     */
    nameNormalized: text('name_normalized').notNull(),

    /** e.g. "1 medium", "1 cup", "100 g". Shown in the UI verbatim. */
    servingLabel: text('serving_label').notNull(),
    /** Grams in one serving. Null when a food has no meaningful weight. */
    servingGrams: real('serving_grams'),

    calories: real('calories').notNull(),
    proteinG: real('protein_g').notNull().default(0),
    carbsG: real('carbs_g').notNull().default(0),
    fatG: real('fat_g').notNull().default(0),

    /**
     * 'seed' rows ship with the app and are replaced on upgrade; 'user' rows are
     * the user's own and must never be touched by a reseed. Without this
     * distinction, updating the shipped database would delete their data.
     */
    source: text('source', { enum: ['seed', 'user'] })
      .notNull()
      .default('user'),

    /** Regional grouping, e.g. "South Indian". Used for browsing, not search. */
    cuisine: text('cuisine'),

    createdAt: timestamp('created_at'),
  },
  (table) => [
    index('foods_name_normalized_idx').on(table.nameNormalized),
    index('foods_source_idx').on(table.source),
  ],
);

/**
 * Recipes: a dish cooked in a batch, with exact ingredient amounts.
 *
 * This is the core of the product. Generic databases guess at "chana masala";
 * here you record what actually went in the pot once, and every future portion
 * is calculated from it.
 */
export const recipes = sqliteTable(
  'recipes',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    nameNormalized: text('name_normalized').notNull(),

    /** How many servings the whole batch yields. Must be >= 1. */
    serves: integer('serves').notNull().default(1),

    notes: text('notes'),
    cuisine: text('cuisine'),

    /**
     * Per-serving nutrition, derived from the ingredients and cached here.
     *
     * Denormalised deliberately: search filters by calories and macros, and
     * recomputing a join-and-sum for every recipe on every keystroke is exactly
     * the kind of thing that makes search feel slow. Recalculated whenever the
     * ingredient list changes -- see recalculateRecipeTotals().
     */
    caloriesPerServing: real('calories_per_serving').notNull().default(0),
    proteinPerServingG: real('protein_per_serving_g').notNull().default(0),
    carbsPerServingG: real('carbs_per_serving_g').notNull().default(0),
    fatPerServingG: real('fat_per_serving_g').notNull().default(0),

    source: text('source', { enum: ['seed', 'user'] })
      .notNull()
      .default('user'),

    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [index('recipes_name_normalized_idx').on(table.nameNormalized)],
);

/**
 * One ingredient line in a recipe.
 *
 * `foodId` is nullable on purpose: a recipe should be writable before every
 * ingredient exists in the food table. An unlinked ingredient still carries its
 * own nutrition, so the recipe total stays correct -- it just cannot be
 * re-costed automatically if the underlying food is corrected later.
 */
export const recipeIngredients = sqliteTable(
  'recipe_ingredients',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      // Deleting a recipe must take its ingredients with it, or the table
      // accumulates orphans that quietly inflate nothing and confuse everything.
      .references(() => recipes.id, { onDelete: 'cascade' }),

    foodId: text('food_id').references(() => foods.id, { onDelete: 'set null' }),

    /** Display text, e.g. "Chickpeas, dried". Kept even when foodId is set. */
    name: text('name').notNull(),

    /** The amount as the cook thinks of it: 400 (g), 1 (medium), 150 (ml). */
    quantity: real('quantity').notNull(),
    /** Unit for `quantity`, e.g. "g", "ml", "medium", "tbsp". */
    unit: text('unit').notNull(),

    /** Nutrition contributed by this line, for the whole batch. */
    calories: real('calories').notNull().default(0),
    proteinG: real('protein_g').notNull().default(0),
    carbsG: real('carbs_g').notNull().default(0),
    fatG: real('fat_g').notNull().default(0),

    /** Preserves the cook's ordering, which is usually the cooking order. */
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('recipe_ingredients_recipe_id_idx').on(table.recipeId)],
);

/**
 * A meal actually eaten.
 *
 * Note the copied nutrition columns -- see decision 1 at the top of this file.
 */
export const foodLogEntries = sqliteTable(
  'food_log_entries',
  {
    id: text('id').primaryKey(),

    /** Local calendar day this meal belongs to. */
    date: isoDate('date'),
    slot: text('slot', { enum: ['breakfast', 'lunch', 'dinner', 'snack'] }).notNull(),

    /** Name as it was at the time of logging. */
    name: text('name').notNull(),

    /** Portions eaten. 1.5 means one and a half servings. */
    servings: real('servings').notNull().default(1),

    /** Totals for this entry, already multiplied by `servings`. */
    calories: real('calories').notNull(),
    proteinG: real('protein_g').notNull().default(0),
    carbsG: real('carbs_g').notNull().default(0),
    fatG: real('fat_g').notNull().default(0),

    /**
     * Provenance only. Set null rather than cascade on delete: removing a food
     * from your library must not erase the meals you ate, which is precisely
     * the history you are trying to keep.
     */
    foodId: text('food_id').references(() => foods.id, { onDelete: 'set null' }),
    recipeId: text('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),

    loggedAt: timestamp('logged_at'),
  },
  (table) => [
    // The dashboard's hottest query is "everything for this date".
    index('food_log_entries_date_idx').on(table.date),
  ],
);

/**
 * "Your usual meals" -- the one-tap re-log list.
 *
 * Built around eating a repeating rotation of home-cooked dishes, which is what
 * makes this different from a generic "recent foods" list: entries are curated
 * by the user and persist, rather than being whatever they happened to eat last.
 */
export const usualMeals = sqliteTable(
  'usual_meals',
  {
    id: text('id').primaryKey(),

    /** Overrides the food/recipe name when set, e.g. "Breakfast (weekday)". */
    label: text('label'),

    foodId: text('food_id').references(() => foods.id, { onDelete: 'cascade' }),
    recipeId: text('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }),

    /** The portion normally eaten, so one tap logs the right amount. */
    servings: real('servings').notNull().default(1),
    /** Prefilled meal slot; null means "ask". */
    slot: text('slot', { enum: ['breakfast', 'lunch', 'dinner', 'snack'] }),

    /** Drives ordering, so the list surfaces what is genuinely used most. */
    useCount: integer('use_count').notNull().default(0),
    lastUsedAt: integer('last_used_at', { mode: 'number' }),

    createdAt: timestamp('created_at'),
  },
  (table) => [
    index('usual_meals_use_count_idx').on(table.useCount),
    // A food or recipe should appear at most once in the list.
    uniqueIndex('usual_meals_food_idx').on(table.foodId),
    uniqueIndex('usual_meals_recipe_idx').on(table.recipeId),
  ],
);

/**
 * Weight readings, one per entry.
 *
 * Always kilograms. Pounds are a display preference, converted at the edge --
 * storing whichever unit was typed makes every later average and delta wrong
 * unless every read remembers to check a unit column.
 */
export const weightEntries = sqliteTable(
  'weight_entries',
  {
    id: text('id').primaryKey(),
    date: isoDate('date'),
    kg: real('kg').notNull(),

    /**
     * Where the reading came from. 'healthkit' rows are imported and may be
     * re-imported, so they carry the external sample id to stay idempotent.
     */
    source: text('source', { enum: ['manual', 'healthkit'] })
      .notNull()
      .default('manual'),
    externalId: text('external_id'),

    loggedAt: timestamp('logged_at'),
  },
  (table) => [
    index('weight_entries_date_idx').on(table.date),
    // Re-importing the same HealthKit sample must not create a duplicate.
    uniqueIndex('weight_entries_external_id_idx').on(table.externalId),
  ],
);

/**
 * Single-row user profile and preferences.
 *
 * A one-row table rather than key-value pairs, so every setting is typed and a
 * typo in a key name is a compile error instead of a silent undefined.
 */
export const profile = sqliteTable('profile', {
  /** Always 1. Enforces a single row. */
  id: integer('id').primaryKey().default(1),

  dailyCalorieTarget: integer('daily_calorie_target').notNull().default(2000),
  dailyStepGoal: integer('daily_step_goal').notNull().default(10000),
  sleepGoalHours: real('sleep_goal_hours').notNull().default(8),
  goalWeightKg: real('goal_weight_kg'),

  proteinTargetG: integer('protein_target_g'),
  carbsTargetG: integer('carbs_target_g'),
  fatTargetG: integer('fat_target_g'),

  /** Display preference only -- storage is always kilograms. */
  weightUnit: text('weight_unit', { enum: ['kg', 'lb'] })
    .notNull()
    .default('kg'),

  updatedAt: timestamp('updated_at'),
});

export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type NewRecipeIngredient = typeof recipeIngredients.$inferInsert;
export type FoodLogEntry = typeof foodLogEntries.$inferSelect;
export type NewFoodLogEntry = typeof foodLogEntries.$inferInsert;
export type UsualMeal = typeof usualMeals.$inferSelect;
export type NewUsualMeal = typeof usualMeals.$inferInsert;
export type WeightEntryRow = typeof weightEntries.$inferSelect;
export type NewWeightEntryRow = typeof weightEntries.$inferInsert;
export type Profile = typeof profile.$inferSelect;

export type MealSlot = FoodLogEntry['slot'];
