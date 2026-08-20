import { normalizeName } from '../../lib/foodSearch';
import type { NewFood } from '../schema';

/**
 * Seed food database -- common Indian foods with per-serving nutrition.
 *
 * ON ACCURACY, WHICH IS THE WHOLE POINT
 * -------------------------------------
 * These are careful estimates for typical home preparations, not laboratory
 * values, and they are the single most important thing in this app to get right
 * over time. Treat them as a starting point to correct, not as ground truth.
 *
 * Two reasons a number here can be wrong for you specifically:
 *
 *   - Home cooking varies enormously. The same dal ranges roughly 120-260 kcal
 *     per serving depending on how much oil or ghee goes in. A tempering
 *     (tadka) alone can add 40-90 kcal.
 *   - Portion size is regional and personal. "One serving" of rice here is
 *     150 g cooked; if your bowl is 250 g, every entry is 60% low.
 *
 * The authoritative reference for Indian foods is the Indian Food Composition
 * Tables (IFCT 2017, NIN Hyderabad). Where a value here disagrees with IFCT,
 * IFCT wins.
 *
 * The recipe feature is the real fix for all of this: once you enter what
 * actually goes in your pot, your numbers stop depending on these averages.
 */

type SeedFood = Omit<NewFood, 'nameNormalized' | 'source'> & { name: string };

const seed = (food: SeedFood): NewFood => ({
  ...food,
  nameNormalized: normalizeName(food.name),
  source: 'seed',
});

export const SEED_FOODS: NewFood[] = [
  // --- Staples: grains and breads ------------------------------------------
  seed({
    id: 'seed-rice-cooked',
    name: 'Rice, cooked',
    servingLabel: '1 cup (150 g)',
    servingGrams: 150,
    calories: 195,
    proteinG: 4,
    carbsG: 43,
    fatG: 0.4,
    cuisine: 'Indian',
  }),
  seed({
    id: 'seed-roti',
    name: 'Roti (whole wheat)',
    servingLabel: '1 medium (40 g)',
    servingGrams: 40,
    calories: 120,
    proteinG: 3,
    carbsG: 23,
    fatG: 2,
    cuisine: 'Indian',
  }),
  seed({
    id: 'seed-chapati-ghee',
    name: 'Chapati with ghee',
    servingLabel: '1 medium (42 g)',
    servingGrams: 42,
    calories: 150,
    proteinG: 3,
    carbsG: 23,
    fatG: 5,
    cuisine: 'Indian',
  }),
  seed({
    id: 'seed-paratha-plain',
    name: 'Paratha, plain',
    servingLabel: '1 medium (60 g)',
    servingGrams: 60,
    calories: 210,
    proteinG: 4,
    carbsG: 28,
    fatG: 9,
    cuisine: 'North Indian',
  }),
  seed({
    id: 'seed-poori',
    name: 'Poori',
    servingLabel: '1 piece (30 g)',
    servingGrams: 30,
    calories: 140,
    proteinG: 2.5,
    carbsG: 16,
    fatG: 7,
    cuisine: 'Indian',
  }),
  seed({
    id: 'seed-naan',
    name: 'Naan',
    servingLabel: '1 piece (90 g)',
    servingGrams: 90,
    calories: 260,
    proteinG: 8,
    carbsG: 45,
    fatG: 5,
    cuisine: 'North Indian',
  }),

  // --- South Indian breakfast ----------------------------------------------
  seed({
    id: 'seed-idli',
    name: 'Idli',
    servingLabel: '1 piece (40 g)',
    servingGrams: 40,
    calories: 58,
    proteinG: 1.6,
    carbsG: 12,
    fatG: 0.2,
    cuisine: 'South Indian',
  }),
  seed({
    id: 'seed-dosa-plain',
    name: 'Dosa, plain',
    servingLabel: '1 medium (80 g)',
    servingGrams: 80,
    calories: 168,
    proteinG: 3.5,
    carbsG: 26,
    fatG: 5,
    cuisine: 'South Indian',
  }),
  seed({
    id: 'seed-masala-dosa',
    name: 'Masala dosa',
    servingLabel: '1 dosa (150 g)',
    servingGrams: 150,
    calories: 290,
    proteinG: 6,
    carbsG: 44,
    fatG: 10,
    cuisine: 'South Indian',
  }),
  seed({
    id: 'seed-upma',
    name: 'Upma',
    servingLabel: '1 cup (180 g)',
    servingGrams: 180,
    calories: 250,
    proteinG: 6,
    carbsG: 38,
    fatG: 8,
    cuisine: 'South Indian',
  }),
  seed({
    id: 'seed-pongal',
    name: 'Ven pongal',
    servingLabel: '1 cup (200 g)',
    servingGrams: 200,
    calories: 310,
    proteinG: 9,
    carbsG: 45,
    fatG: 10,
    cuisine: 'South Indian',
  }),
  seed({
    id: 'seed-sambar',
    name: 'Sambar',
    servingLabel: '1 cup (200 ml)',
    servingGrams: 200,
    calories: 140,
    proteinG: 6,
    carbsG: 18,
    fatG: 4.5,
    cuisine: 'South Indian',
  }),
  seed({
    id: 'seed-coconut-chutney',
    name: 'Coconut chutney',
    servingLabel: '2 tbsp (30 g)',
    servingGrams: 30,
    calories: 65,
    proteinG: 1.2,
    carbsG: 3,
    fatG: 5.5,
    cuisine: 'South Indian',
  }),
  seed({
    id: 'seed-rasam',
    name: 'Rasam',
    servingLabel: '1 cup (200 ml)',
    servingGrams: 200,
    calories: 65,
    proteinG: 2.5,
    carbsG: 9,
    fatG: 2,
    cuisine: 'South Indian',
  }),

  // --- Dals and legumes ----------------------------------------------------
  seed({
    id: 'seed-dal-tadka',
    name: 'Dal tadka',
    servingLabel: '1 cup (200 g)',
    servingGrams: 200,
    calories: 200,
    proteinG: 10,
    carbsG: 26,
    fatG: 6.5,
    cuisine: 'North Indian',
  }),
  seed({
    id: 'seed-chana-masala',
    name: 'Chana masala',
    servingLabel: '1 cup (200 g)',
    servingGrams: 200,
    calories: 310,
    proteinG: 12,
    carbsG: 40,
    fatG: 9,
    cuisine: 'North Indian',
  }),
  seed({
    id: 'seed-rajma',
    name: 'Rajma masala',
    servingLabel: '1 cup (200 g)',
    servingGrams: 200,
    calories: 280,
    proteinG: 12,
    carbsG: 38,
    fatG: 8,
    cuisine: 'North Indian',
  }),
  seed({
    id: 'seed-sambar-dal',
    name: 'Toor dal, cooked',
    servingLabel: '1 cup (200 g)',
    servingGrams: 200,
    calories: 190,
    proteinG: 11,
    carbsG: 30,
    fatG: 2,
    cuisine: 'Indian',
  }),

  // --- Vegetables and mains ------------------------------------------------
  seed({
    id: 'seed-aloo-gobi',
    name: 'Aloo gobi',
    servingLabel: '1 cup (180 g)',
    servingGrams: 180,
    calories: 200,
    proteinG: 4,
    carbsG: 24,
    fatG: 10,
    cuisine: 'North Indian',
  }),
  seed({
    id: 'seed-bhindi-masala',
    name: 'Bhindi masala',
    servingLabel: '1 cup (150 g)',
    servingGrams: 150,
    calories: 165,
    proteinG: 3,
    carbsG: 14,
    fatG: 11,
    cuisine: 'North Indian',
  }),
  seed({
    id: 'seed-palak-paneer',
    name: 'Palak paneer',
    servingLabel: '1 cup (200 g)',
    servingGrams: 200,
    calories: 320,
    proteinG: 14,
    carbsG: 12,
    fatG: 24,
    cuisine: 'North Indian',
  }),
  seed({
    id: 'seed-paneer-butter-masala',
    name: 'Paneer butter masala',
    servingLabel: '1 cup (200 g)',
    servingGrams: 200,
    calories: 420,
    proteinG: 16,
    carbsG: 16,
    fatG: 32,
    cuisine: 'North Indian',
  }),
  seed({
    id: 'seed-veg-biryani',
    name: 'Vegetable biryani',
    servingLabel: '1 cup (200 g)',
    servingGrams: 200,
    calories: 340,
    proteinG: 7,
    carbsG: 52,
    fatG: 11,
    cuisine: 'Indian',
  }),
  seed({
    id: 'seed-chicken-curry',
    name: 'Chicken curry',
    servingLabel: '1 cup (200 g)',
    servingGrams: 200,
    calories: 290,
    proteinG: 25,
    carbsG: 8,
    fatG: 18,
    cuisine: 'Indian',
  }),
  seed({
    id: 'seed-egg-curry',
    name: 'Egg curry',
    servingLabel: '1 cup, 2 eggs (200 g)',
    servingGrams: 200,
    calories: 280,
    proteinG: 15,
    carbsG: 9,
    fatG: 20,
    cuisine: 'Indian',
  }),

  // --- Sides and snacks ----------------------------------------------------
  // Raw dairy (paneer, curd, ghee) lives in seed/ingredients.ts instead: those
  // are things you cook with, not dishes you log, and duplicating them here
  // put two "Ghee" entries in search.
  seed({
    id: 'seed-samosa',
    name: 'Samosa',
    servingLabel: '1 piece (60 g)',
    servingGrams: 60,
    calories: 210,
    proteinG: 4,
    carbsG: 24,
    fatG: 11,
    cuisine: 'Indian',
  }),
  seed({
    id: 'seed-masala-chai',
    name: 'Masala chai with milk and sugar',
    servingLabel: '1 cup (150 ml)',
    servingGrams: 150,
    calories: 105,
    proteinG: 3,
    carbsG: 13,
    fatG: 4,
    cuisine: 'Indian',
  }),
];
