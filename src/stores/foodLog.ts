import { create } from 'zustand';
import { today } from '../lib/dates';
import { sumNutrition, type LoggedFood, type NutritionFacts } from '../lib/nutrition';

/**
 * Today's food log.
 *
 * In-memory for now. The SQLite layer will replace the array below while
 * keeping this exact interface, so no screen changes when persistence lands --
 * which is the whole reason components read through a store rather than
 * querying a database directly.
 */

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodLogEntry = LoggedFood & {
  date: string;
  slot: MealSlot;
  loggedAt: Date;
};

type FoodLogState = {
  entries: FoodLogEntry[];
  addEntry: (entry: Omit<FoodLogEntry, 'id' | 'loggedAt'>) => void;
  removeEntry: (id: string) => void;
  entriesFor: (date: string) => FoodLogEntry[];
  totalsFor: (date: string) => NutritionFacts;
};

// Monotonic counter rather than Math.random(), so ids are stable and comparable.
let nextId = 0;
const makeId = () => `entry-${++nextId}`;

export const useFoodLog = create<FoodLogState>((set, get) => ({
  entries: seedEntries(),

  addEntry: (entry) =>
    set((state) => ({
      entries: [...state.entries, { ...entry, id: makeId(), loggedAt: new Date() }],
    })),

  removeEntry: (id) =>
    set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),

  entriesFor: (date) => get().entries.filter((entry) => entry.date === date),

  totalsFor: (date) => sumNutrition(get().entriesFor(date)),
}));

/**
 * Placeholder meals so the dashboard has something to render before the food
 * database exists. Deleted once logging is wired to SQLite.
 */
function seedEntries(): FoodLogEntry[] {
  const date = today();
  return [
    {
      id: makeId(),
      date,
      slot: 'breakfast',
      name: 'Idli with sambar',
      servings: 1,
      calories: 285,
      protein: 9,
      carbs: 52,
      fat: 4,
      loggedAt: new Date(),
    },
    {
      id: makeId(),
      date,
      slot: 'lunch',
      name: 'Chana masala',
      servings: 1,
      calories: 310,
      protein: 12,
      carbs: 40,
      fat: 9,
      loggedAt: new Date(),
    },
    {
      id: makeId(),
      date,
      slot: 'lunch',
      name: 'Roti',
      servings: 2,
      calories: 240,
      protein: 6,
      carbs: 46,
      fat: 4,
      loggedAt: new Date(),
    },
  ];
}
