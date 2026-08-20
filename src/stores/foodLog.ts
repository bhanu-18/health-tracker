import { create } from 'zustand';
import * as repo from '../db/repositories/foodLog';
import type { FoodLogEntry, MealSlot } from '../db/schema';
import { sumNutrition, type NutritionFacts } from '../lib/nutrition';

/**
 * Today's food log, backed by SQLite.
 *
 * The store holds entries for one date at a time -- the date the user is
 * looking at -- rather than the whole history. Loading years of meals into
 * memory to render one day would be wasteful, and the history screen queries
 * aggregates directly instead.
 *
 * IMPORTANT: expose plain arrays and let components derive with useMemo. A
 * selector that filters or reduces returns a new reference every call, which
 * Zustand reads as a state change and turns into an infinite render loop.
 * See app/__tests__/today-screen.test.tsx.
 */

export type { MealSlot };

type FoodLogState = {
  /** Entries for `loadedDate`. Stable reference between changes. */
  entries: FoodLogEntry[];
  loadedDate: string | null;
  isLoading: boolean;
  error: string | null;

  loadForDate: (date: string) => Promise<void>;
  logMeal: (input: repo.LogMealInput) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  setServings: (id: string, servings: number) => Promise<void>;
};

export const useFoodLog = create<FoodLogState>((set, get) => ({
  entries: [],
  loadedDate: null,
  isLoading: false,
  error: null,

  loadForDate: async (date) => {
    set({ isLoading: true, error: null });
    try {
      const entries = await repo.getEntriesForDate(date);
      set({ entries, loadedDate: date, isLoading: false });
    } catch (cause) {
      set({
        isLoading: false,
        error: cause instanceof Error ? cause.message : 'Could not load your meals.',
      });
    }
  },

  logMeal: async (input) => {
    try {
      await repo.logMeal(input);
      // Reload rather than appending locally: the database assigns the id and
      // timestamp, and re-reading keeps the list in the same order it will have
      // on the next launch.
      if (get().loadedDate === input.date) {
        await get().loadForDate(input.date);
      }
    } catch (cause) {
      set({ error: cause instanceof Error ? cause.message : 'Could not save the meal.' });
    }
  },

  removeEntry: async (id) => {
    const date = get().loadedDate;
    try {
      await repo.deleteEntry(id);
      if (date) await get().loadForDate(date);
    } catch (cause) {
      set({ error: cause instanceof Error ? cause.message : 'Could not remove the meal.' });
    }
  },

  setServings: async (id, servings) => {
    const date = get().loadedDate;
    try {
      await repo.updateServings(id, servings);
      if (date) await get().loadForDate(date);
    } catch (cause) {
      set({ error: cause instanceof Error ? cause.message : 'Could not update the portion.' });
    }
  },
}));

/**
 * Totals for a set of entries.
 *
 * A plain function rather than a store selector, precisely because it derives:
 * calling it inside a selector would return a new object every time and loop.
 */
export function totalsFor(entries: readonly FoodLogEntry[]): NutritionFacts {
  return sumNutrition(
    entries.map((entry) => ({
      calories: entry.calories,
      protein: entry.proteinG,
      carbs: entry.carbsG,
      fat: entry.fatG,
    })),
  );
}
