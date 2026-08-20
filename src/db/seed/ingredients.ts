import { normalizeName } from '../../lib/foodSearch';
import type { NewFood } from '../schema';

/**
 * Raw ingredients, for building recipes.
 *
 * Separate from seed/foods.ts, which holds prepared dishes. The distinction is
 * not cosmetic: a recipe is assembled from ingredients, and the original seed
 * had almost none, which made the recipe feature unusable -- you cannot enter
 * fried rice from a list containing only finished dishes.
 *
 * ON ACCURACY
 * -----------
 * These are more trustworthy than the prepared-dish estimates, and for a real
 * reason: raw ingredients have no cooking variation. 100 g of dry basmati rice
 * is 100 g of dry basmati rice, whereas "one serving of dal" swings 100+ kcal
 * on how much ghee went in. Values follow standard composition tables (IFCT
 * 2017 and USDA); IFCT wins where they disagree.
 *
 * This is exactly why the recipe feature improves accuracy: it replaces a
 * guessed dish total with a sum of well-characterised ingredients.
 *
 * EVERY ENTRY RECORDS servingGrams.
 * Recipe scaling by weight divides the amount by the serving weight, and
 * returns null when it is missing -- so a food without it cannot be used with
 * grams at all. Countable items (one egg, one medium onion) carry a realistic
 * gram weight so both "2 pieces" and "220 g" scale correctly.
 */

type SeedIngredient = Omit<NewFood, 'nameNormalized' | 'source'> & { name: string };

const ing = (food: SeedIngredient): NewFood => ({
  ...food,
  nameNormalized: normalizeName(food.name),
  source: 'seed',
});

/** Per 100 g of the raw ingredient, unless the label says otherwise. */
const per100g = (
  id: string,
  name: string,
  calories: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  cuisine = 'Ingredient',
): NewFood =>
  ing({
    id,
    name,
    servingLabel: '100 g',
    servingGrams: 100,
    calories,
    proteinG,
    carbsG,
    fatG,
    cuisine,
  });

/** A countable item, with a realistic weight so grams work too. */
const perPiece = (
  id: string,
  name: string,
  label: string,
  grams: number,
  calories: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  cuisine = 'Ingredient',
): NewFood =>
  ing({
    id,
    name,
    servingLabel: label,
    servingGrams: grams,
    calories,
    proteinG,
    carbsG,
    fatG,
    cuisine,
  });

export const SEED_INGREDIENTS: NewFood[] = [
  // --- Rice, grains and flours (raw weight) --------------------------------
  per100g('ing-basmati-raw', 'Basmati rice, raw', 350, 7.5, 78, 0.9, 'Grain'),
  per100g('ing-rice-white-raw', 'White rice, raw', 345, 6.8, 78, 0.5, 'Grain'),
  per100g('ing-rice-brown-raw', 'Brown rice, raw', 362, 7.9, 76, 2.9, 'Grain'),
  per100g('ing-poha', 'Poha (flattened rice)', 350, 6.6, 77, 1.2, 'Grain'),
  per100g('ing-rava', 'Rava (semolina)', 360, 10.4, 74, 1.1, 'Grain'),
  per100g('ing-atta', 'Wheat flour (atta)', 340, 12, 71, 1.7, 'Grain'),
  per100g('ing-maida', 'Maida (refined flour)', 348, 10, 74, 1, 'Grain'),
  per100g('ing-besan', 'Besan (gram flour)', 387, 22, 58, 6.7, 'Grain'),
  per100g('ing-oats', 'Oats, rolled', 389, 16.9, 66, 6.9, 'Grain'),
  per100g('ing-quinoa', 'Quinoa, raw', 368, 14.1, 64, 6.1, 'Grain'),
  per100g('ing-pasta-dry', 'Pasta, dry', 371, 13, 75, 1.5, 'Grain'),
  per100g('ing-noodles-dry', 'Noodles, dry', 380, 9, 72, 6, 'Grain'),
  per100g('ing-vermicelli', 'Vermicelli (semiya), raw', 350, 10, 75, 1, 'Grain'),
  perPiece('ing-bread-slice', 'Bread, white', '1 slice (30 g)', 30, 80, 2.7, 15, 1, 'Grain'),
  perPiece(
    'ing-bread-brown',
    'Bread, whole wheat',
    '1 slice (30 g)',
    30,
    75,
    3.6,
    13,
    1.1,
    'Grain',
  ),

  // --- Dals and legumes (dry weight) ---------------------------------------
  per100g('ing-toor-dal', 'Toor dal, dry', 343, 22, 62, 1.7, 'Legume'),
  per100g('ing-moong-dal', 'Moong dal, dry', 347, 24, 59, 1.2, 'Legume'),
  per100g('ing-chana-dal', 'Chana dal, dry', 360, 20, 60, 5.6, 'Legume'),
  per100g('ing-urad-dal', 'Urad dal, dry', 341, 25, 59, 1.6, 'Legume'),
  per100g('ing-masoor-dal', 'Masoor dal, dry', 352, 25, 60, 1.1, 'Legume'),
  per100g('ing-rajma-dry', 'Rajma (kidney beans), dry', 333, 24, 60, 0.8, 'Legume'),
  per100g('ing-chickpeas-dry', 'Chickpeas (chana), dry', 364, 19, 61, 6, 'Legume'),
  per100g('ing-kala-chana', 'Kala chana, dry', 360, 20, 61, 5, 'Legume'),
  per100g('ing-soya-chunks', 'Soya chunks, dry', 345, 52, 33, 0.5, 'Legume'),
  per100g('ing-green-peas', 'Green peas', 81, 5.4, 14, 0.4, 'Vegetable'),

  // --- Vegetables ----------------------------------------------------------
  perPiece('ing-onion', 'Onion', '1 medium (110 g)', 110, 44, 1.2, 10.3, 0.1, 'Vegetable'),
  perPiece('ing-tomato', 'Tomato', '1 medium (120 g)', 120, 22, 1.1, 4.8, 0.2, 'Vegetable'),
  perPiece('ing-potato', 'Potato', '1 medium (150 g)', 150, 116, 3, 26, 0.2, 'Vegetable'),
  perPiece('ing-carrot', 'Carrot', '1 medium (60 g)', 60, 25, 0.6, 5.8, 0.1, 'Vegetable'),
  perPiece(
    'ing-capsicum',
    'Capsicum (bell pepper)',
    '1 medium (120 g)',
    120,
    24,
    1,
    6,
    0.2,
    'Vegetable',
  ),
  per100g('ing-green-beans', 'Green beans', 31, 1.8, 7, 0.1, 'Vegetable'),
  per100g('ing-cauliflower', 'Cauliflower', 25, 1.9, 5, 0.3, 'Vegetable'),
  per100g('ing-cabbage', 'Cabbage', 25, 1.3, 5.8, 0.1, 'Vegetable'),
  per100g('ing-spinach', 'Spinach (palak)', 23, 2.9, 3.6, 0.4, 'Vegetable'),
  per100g('ing-okra', 'Okra (bhindi)', 33, 1.9, 7.5, 0.2, 'Vegetable'),
  per100g('ing-brinjal', 'Brinjal (baingan)', 25, 1, 6, 0.2, 'Vegetable'),
  per100g('ing-bottle-gourd', 'Bottle gourd (lauki)', 14, 0.6, 3.4, 0.1, 'Vegetable'),
  per100g('ing-cucumber', 'Cucumber', 15, 0.7, 3.6, 0.1, 'Vegetable'),
  per100g('ing-mushroom', 'Mushrooms', 22, 3.1, 3.3, 0.3, 'Vegetable'),
  per100g('ing-sweet-corn', 'Sweet corn', 86, 3.3, 19, 1.2, 'Vegetable'),
  per100g('ing-beetroot', 'Beetroot', 43, 1.6, 10, 0.2, 'Vegetable'),
  per100g('ing-pumpkin', 'Pumpkin', 26, 1, 6.5, 0.1, 'Vegetable'),
  per100g('ing-radish', 'Radish (mooli)', 16, 0.7, 3.4, 0.1, 'Vegetable'),
  per100g('ing-drumstick', 'Drumstick', 37, 2.1, 8.5, 0.2, 'Vegetable'),
  perPiece('ing-garlic-clove', 'Garlic', '1 clove (3 g)', 3, 4, 0.2, 1, 0, 'Vegetable'),
  per100g('ing-ginger', 'Ginger', 80, 1.8, 18, 0.8, 'Vegetable'),
  perPiece('ing-green-chilli', 'Green chilli', '1 chilli (5 g)', 5, 2, 0.1, 0.5, 0, 'Vegetable'),
  per100g('ing-coriander-leaves', 'Coriander leaves', 23, 2.1, 3.7, 0.5, 'Vegetable'),
  per100g('ing-curry-leaves', 'Curry leaves', 108, 6.1, 18.7, 1, 'Vegetable'),
  perPiece('ing-spring-onion', 'Spring onion', '1 stalk (15 g)', 15, 5, 0.3, 1.1, 0, 'Vegetable'),

  // --- Dairy and eggs ------------------------------------------------------
  per100g('ing-milk-whole', 'Milk, whole', 61, 3.2, 4.8, 3.3, 'Dairy'),
  per100g('ing-milk-toned', 'Milk, toned', 50, 3.1, 4.7, 2, 'Dairy'),
  per100g('ing-curd', 'Curd (dahi)', 60, 3.5, 4.7, 3.3, 'Dairy'),
  per100g('ing-greek-yogurt', 'Greek yogurt, plain', 59, 10, 3.6, 0.4, 'Dairy'),
  per100g('ing-yogurt-lowfat', 'Yogurt, low fat', 63, 5.3, 7, 1.6, 'Dairy'),
  per100g('ing-paneer-raw', 'Paneer', 321, 18, 3.6, 25, 'Dairy'),
  per100g('ing-cream', 'Fresh cream', 292, 2.1, 2.8, 30, 'Dairy'),
  perPiece('ing-cheese-slice', 'Cheese slice', '1 slice (20 g)', 20, 70, 4, 1, 5.5, 'Dairy'),
  perPiece('ing-butter', 'Butter', '1 tsp (5 g)', 5, 36, 0, 0, 4.1, 'Dairy'),
  perPiece('ing-ghee-tsp', 'Ghee', '1 tsp (5 g)', 5, 45, 0, 0, 5, 'Dairy'),
  perPiece('ing-egg', 'Egg', '1 large (50 g)', 50, 72, 6.3, 0.4, 4.8, 'Protein'),
  perPiece('ing-egg-white', 'Egg white', '1 large (33 g)', 33, 17, 3.6, 0.2, 0.1, 'Protein'),

  // --- Meat, fish and alternatives (raw) -----------------------------------
  per100g('ing-chicken-breast', 'Chicken breast, raw', 165, 31, 0, 3.6, 'Protein'),
  per100g('ing-chicken-thigh', 'Chicken thigh, raw', 209, 26, 0, 11, 'Protein'),
  per100g('ing-mutton', 'Mutton, raw', 294, 25, 0, 21, 'Protein'),
  per100g('ing-fish-rohu', 'Fish (rohu), raw', 97, 17, 0, 3, 'Protein'),
  per100g('ing-prawns', 'Prawns, raw', 99, 24, 0.2, 0.3, 'Protein'),
  per100g('ing-tofu', 'Tofu', 76, 8, 1.9, 4.8, 'Protein'),

  // --- Oils and fats -------------------------------------------------------
  perPiece('ing-sunflower-oil', 'Sunflower oil', '1 tbsp (14 g)', 14, 124, 0, 0, 14, 'Fat'),
  perPiece('ing-coconut-oil', 'Coconut oil', '1 tbsp (14 g)', 14, 121, 0, 0, 14, 'Fat'),
  perPiece('ing-mustard-oil', 'Mustard oil', '1 tbsp (14 g)', 14, 124, 0, 0, 14, 'Fat'),
  perPiece('ing-olive-oil', 'Olive oil', '1 tbsp (14 g)', 14, 119, 0, 0, 13.5, 'Fat'),

  // --- Nuts and seeds ------------------------------------------------------
  per100g('ing-almonds', 'Almonds', 579, 21, 22, 50, 'Nut'),
  per100g('ing-cashews', 'Cashews', 553, 18, 30, 44, 'Nut'),
  per100g('ing-peanuts', 'Peanuts', 567, 26, 16, 49, 'Nut'),
  per100g('ing-walnuts', 'Walnuts', 654, 15, 14, 65, 'Nut'),
  per100g('ing-sesame-seeds', 'Sesame seeds', 573, 18, 23, 50, 'Nut'),
  per100g('ing-flax-seeds', 'Flax seeds', 534, 18, 29, 42, 'Nut'),
  per100g('ing-chia-seeds', 'Chia seeds', 486, 17, 42, 31, 'Nut'),
  per100g('ing-coconut-fresh', 'Coconut, fresh', 354, 3.3, 15, 33, 'Nut'),
  per100g('ing-coconut-dry', 'Coconut, desiccated', 660, 6.9, 24, 65, 'Nut'),

  // --- Spices and condiments -----------------------------------------------
  perPiece('ing-turmeric', 'Turmeric powder', '1 tsp (3 g)', 3, 10, 0.3, 2, 0.1, 'Spice'),
  perPiece('ing-chilli-powder', 'Red chilli powder', '1 tsp (3 g)', 3, 9, 0.4, 1.6, 0.4, 'Spice'),
  perPiece('ing-garam-masala', 'Garam masala', '1 tsp (3 g)', 3, 11, 0.4, 1.8, 0.5, 'Spice'),
  perPiece('ing-cumin-seeds', 'Cumin seeds (jeera)', '1 tsp (2 g)', 2, 8, 0.4, 0.9, 0.4, 'Spice'),
  perPiece('ing-mustard-seeds', 'Mustard seeds', '1 tsp (3 g)', 3, 15, 0.8, 1.1, 1, 'Spice'),
  perPiece('ing-coriander-powder', 'Coriander powder', '1 tsp (3 g)', 3, 9, 0.4, 1.6, 0.5, 'Spice'),
  perPiece(
    'ing-ginger-garlic-paste',
    'Ginger garlic paste',
    '1 tbsp (15 g)',
    15,
    15,
    0.7,
    3,
    0.1,
    'Spice',
  ),
  perPiece('ing-soy-sauce', 'Soy sauce', '1 tbsp (16 g)', 16, 8, 1.3, 0.8, 0, 'Condiment'),
  perPiece('ing-vinegar', 'Vinegar', '1 tbsp (15 g)', 15, 3, 0, 0.1, 0, 'Condiment'),
  perPiece('ing-ketchup', 'Tomato ketchup', '1 tbsp (17 g)', 17, 20, 0.2, 5, 0, 'Condiment'),
  perPiece('ing-tamarind-paste', 'Tamarind paste', '1 tbsp (16 g)', 16, 15, 0.1, 4, 0, 'Condiment'),
  perPiece(
    'ing-tomato-puree',
    'Tomato puree',
    '100 ml (100 g)',
    100,
    38,
    1.7,
    8.6,
    0.2,
    'Condiment',
  ),
  per100g('ing-salt', 'Salt', 0, 0, 0, 0, 'Spice'),

  // --- Sweeteners ----------------------------------------------------------
  perPiece('ing-sugar', 'Sugar', '1 tsp (4 g)', 4, 16, 0, 4, 0, 'Sweetener'),
  per100g('ing-jaggery', 'Jaggery', 383, 0.4, 98, 0.1, 'Sweetener'),
  perPiece('ing-honey', 'Honey', '1 tbsp (21 g)', 21, 64, 0.1, 17, 0, 'Sweetener'),

  // --- Fruits --------------------------------------------------------------
  perPiece('ing-banana', 'Banana', '1 medium (120 g)', 120, 105, 1.3, 27, 0.4, 'Fruit'),
  perPiece('ing-apple', 'Apple', '1 medium (180 g)', 180, 95, 0.5, 25, 0.3, 'Fruit'),
  perPiece('ing-orange', 'Orange', '1 medium (130 g)', 130, 62, 1.2, 15, 0.2, 'Fruit'),
  per100g('ing-mango', 'Mango', 60, 0.8, 15, 0.4, 'Fruit'),
  per100g('ing-papaya', 'Papaya', 43, 0.5, 11, 0.3, 'Fruit'),
  per100g('ing-guava', 'Guava', 68, 2.6, 14, 1, 'Fruit'),
  per100g('ing-grapes', 'Grapes', 69, 0.7, 18, 0.2, 'Fruit'),
  per100g('ing-pomegranate', 'Pomegranate', 83, 1.7, 19, 1.2, 'Fruit'),
  per100g('ing-watermelon', 'Watermelon', 30, 0.6, 7.6, 0.2, 'Fruit'),
  perPiece('ing-date', 'Dates', '1 date (8 g)', 8, 23, 0.2, 6, 0, 'Fruit'),
  per100g('ing-lemon', 'Lemon', 29, 1.1, 9.3, 0.3, 'Fruit'),
];
