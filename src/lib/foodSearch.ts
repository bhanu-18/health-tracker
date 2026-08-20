/**
 * Food search: name normalisation, matching and ranking.
 *
 * Pure functions over plain data, so the ranking rules can be tested without a
 * database. Rule-based by design -- no AI, per the V1 scope.
 *
 * The interesting problem is transliteration. Indian dish names have no single
 * correct Latin spelling: chana and channa, dal and daal, paneer and panir,
 * roti and rotti are all the same food. A user who types the spelling they grew
 * up with and gets "no results" concludes the database is missing their food,
 * which is exactly the failure this app exists to fix.
 */

/**
 * Vowel digraphs that represent the same sound as a single vowel.
 *
 * KNOWN COLLISION: this maps "puree" and "poori" onto the same key, so a search
 * for "puri" (fried bread) also matches "tomato puree" (a recipe ingredient).
 * Accepted deliberately -- ranking puts the exact match at 100 and the
 * substring match at 20, so the right food is still first, and the alternative
 * is failing to find poori/puri at all, which is the far worse outcome for the
 * users this database is for.
 */
const VOWEL_DIGRAPHS: readonly (readonly [RegExp, string])[] = [
  // paneer -> panir, kheer -> khir
  [/ee/g, 'i'],
  // choora -> chura, poori -> puri
  [/oo/g, 'u'],
];

/**
 * Reduce a name to a comparable search key.
 *
 * Applied to both the stored name (once, at write time) and the query (on every
 * keystroke), so the two meet in the middle. Order matters: vowel digraphs are
 * mapped before doubled letters collapse, otherwise "paneer" would become
 * "paner" rather than "panir" and stop matching "panir".
 */
export function normalizeName(input: string): string {
  let text = input.toLowerCase();

  // Strip accents: "purée" -> "puree".
  text = text.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Punctuation and hyphens become separators, not deletions, so "aloo-gobi"
  // stays two words rather than collapsing into one.
  text = text.replace(/[^a-z0-9]+/g, ' ');

  for (const [pattern, replacement] of VOWEL_DIGRAPHS) {
    text = text.replace(pattern, replacement);
  }

  // w and v are used interchangeably in transliteration: chawal / chaval.
  text = text.replace(/w/g, 'v');

  // Collapse any remaining doubled letter: channa -> chana, daal -> dal.
  text = text.replace(/(.)\1+/g, '$1');

  return text.trim().replace(/\s+/g, ' ');
}

export type SearchableFood = {
  id: string;
  name: string;
  nameNormalized: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type NutrientRange = {
  min?: number;
  max?: number;
};

export type SearchFilters = {
  calories?: NutrientRange;
  proteinG?: NutrientRange;
  carbsG?: NutrientRange;
  fatG?: NutrientRange;
};

const withinRange = (value: number, range: NutrientRange | undefined): boolean => {
  if (!range) return true;
  if (range.min != null && value < range.min) return false;
  if (range.max != null && value > range.max) return false;
  return true;
};

/** Whether a food satisfies every supplied nutrient range. */
export function matchesFilters(food: SearchableFood, filters: SearchFilters): boolean {
  return (
    withinRange(food.calories, filters.calories) &&
    withinRange(food.proteinG, filters.proteinG) &&
    withinRange(food.carbsG, filters.carbsG) &&
    withinRange(food.fatG, filters.fatG)
  );
}

/**
 * Relevance score, higher is better. 0 means no match at all.
 *
 * Deliberately coarse and explainable. A user typing "chana" wants "Chana
 * masala" above "Rajma chana salad", and both above something that merely
 * contains the letters. Anything subtler is guesswork dressed up as precision.
 */
export function scoreMatch(query: string, food: SearchableFood): number {
  const q = normalizeName(query);
  if (q.length === 0) return 0;

  const name = food.nameNormalized;

  if (name === q) return 100;
  if (name.startsWith(`${q} `)) return 80;

  // Whole-word match anywhere: "masala" in "chana masala".
  const words = name.split(' ');
  if (words.includes(q)) return 60;

  // A word beginning with the query: "chan" matching "chana".
  if (words.some((word) => word.startsWith(q))) return 40;

  // Substring anywhere. Last resort, and only for queries long enough that a
  // stray match is unlikely -- two characters would match almost everything.
  if (q.length >= 3 && name.includes(q)) return 20;

  // Every query word appears somewhere, in any order: "masala chana".
  const queryWords = q.split(' ').filter(Boolean);
  if (queryWords.length > 1 && queryWords.every((word) => name.includes(word))) return 30;

  return 0;
}

export type SortOrder = 'relevance' | 'calories' | 'proteinDensity';

/**
 * Protein per 100 kcal.
 *
 * The metric that matters when hitting a protein target inside a calorie
 * budget, and it ranks very differently from raw protein: almonds carry 21 g
 * per 100 g but at 579 kcal, while chicken breast has 31 g at 165 kcal. By
 * absolute protein they look comparable; by density chicken is about six times
 * better. Sorting by raw grams would put nuts near the top of a "high protein"
 * list, which is true and useless.
 *
 * Returns 0 for zero-calorie foods rather than Infinity, so a spice with a
 * trace of protein cannot head the list.
 */
export function proteinDensity(food: SearchableFood): number {
  if (food.calories <= 0) return 0;
  return (food.proteinG / food.calories) * 100;
}

const comparators: Record<SortOrder, (a: SearchableFood, b: SearchableFood) => number> = {
  relevance: () => 0,
  calories: (a, b) => a.calories - b.calories,
  proteinDensity: (a, b) => proteinDensity(b) - proteinDensity(a),
};

/**
 * Rank foods for a query, applying filters and dropping non-matches.
 *
 * An empty query returns everything that passes the filters, so the calorie and
 * macro filters are usable on their own for browsing.
 */
export function searchFoods<T extends SearchableFood>(
  foods: readonly T[],
  query: string,
  filters: SearchFilters = {},
  sort: SortOrder = 'relevance',
): T[] {
  const trimmed = query.trim();
  const filtered = foods.filter((food) => matchesFilters(food, filters));
  const compare = comparators[sort];

  if (trimmed.length === 0) {
    return [...filtered].sort((a, b) => compare(a, b) || a.name.localeCompare(b.name));
  }

  return (
    filtered
      .map((food) => ({ food, score: scoreMatch(trimmed, food) }))
      .filter((entry) => entry.score > 0)
      // Relevance still wins while a query is active: someone who typed
      // "paneer" wants paneer, not whichever match happens to be leanest.
      // An explicit sort orders within equal relevance.
      .sort(
        (a, b) =>
          b.score - a.score || compare(a.food, b.food) || a.food.name.localeCompare(b.food.name),
      )
      .map((entry) => entry.food)
  );
}
