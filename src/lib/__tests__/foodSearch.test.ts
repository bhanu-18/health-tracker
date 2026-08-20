import {
  matchesFilters,
  normalizeName,
  proteinDensity,
  scoreMatch,
  searchFoods,
  type SearchableFood,
} from '../foodSearch';

const food = (name: string, nutrition: Partial<SearchableFood> = {}): SearchableFood => ({
  id: name,
  name,
  nameNormalized: normalizeName(name),
  calories: 100,
  proteinG: 5,
  carbsG: 10,
  fatG: 3,
  ...nutrition,
});

describe('normalizeName', () => {
  it('lowercases and trims', () => {
    expect(normalizeName('  Chana Masala  ')).toBe('chana masala');
  });

  it('strips accents', () => {
    expect(normalizeName('Purée')).toBe(normalizeName('puree'));
  });

  // Documents an accepted false positive rather than pretending it is absent.
  // See the note on VOWEL_DIGRAPHS: "puree" and "poori" collapse to one key.
  it('collides tomato puree with poori, which ranking is left to separate', () => {
    expect(normalizeName('puree')).toBe(normalizeName('poori'));

    const library = [food('Poori'), food('Tomato puree')];
    // The exact match still wins, which is what keeps the collision tolerable.
    expect(searchFoods(library, 'puri')[0]!.name).toBe('Poori');
  });

  it('treats punctuation as a separator rather than deleting it', () => {
    // "aloo-gobi" must stay two words, or word-boundary matching breaks.
    expect(normalizeName('Aloo-Gobi')).toBe('alu gobi');
  });

  // The point of the whole module: the same dish spelled different ways.
  it.each([
    ['chana', 'channa'],
    ['dal', 'daal'],
    ['paneer', 'panir'],
    ['roti', 'rotti'],
    ['chawal', 'chaval'],
    ['poori', 'puri'],
  ])('treats %s and %s as the same food', (a, b) => {
    expect(normalizeName(a)).toBe(normalizeName(b));
  });

  it('keeps genuinely different dishes distinct', () => {
    expect(normalizeName('rajma')).not.toBe(normalizeName('rasam'));
    expect(normalizeName('idli')).not.toBe(normalizeName('dosa'));
  });
});

describe('scoreMatch', () => {
  const chanaMasala = food('Chana masala');

  it('ranks an exact name highest', () => {
    expect(scoreMatch('chana masala', chanaMasala)).toBe(100);
  });

  it('ranks a prefix above a mid-name word', () => {
    expect(scoreMatch('chana', chanaMasala)).toBeGreaterThan(scoreMatch('masala', chanaMasala));
  });

  it('matches a misspelling that normalises the same', () => {
    expect(scoreMatch('channa masala', chanaMasala)).toBe(100);
  });

  it('returns 0 for an unrelated query', () => {
    expect(scoreMatch('biryani', chanaMasala)).toBe(0);
  });

  it('ignores an empty query', () => {
    expect(scoreMatch('   ', chanaMasala)).toBe(0);
  });

  it('does not substring-match on very short queries', () => {
    // "as" appears inside "masala" but is too short to be a deliberate search.
    expect(scoreMatch('as', chanaMasala)).toBe(0);
  });
});

describe('matchesFilters', () => {
  const item = food('Test', { calories: 300, proteinG: 20, carbsG: 30, fatG: 10 });

  it('passes everything when no filters are set', () => {
    expect(matchesFilters(item, {})).toBe(true);
  });

  it('applies an inclusive minimum and maximum', () => {
    expect(matchesFilters(item, { calories: { min: 300 } })).toBe(true);
    expect(matchesFilters(item, { calories: { max: 300 } })).toBe(true);
    expect(matchesFilters(item, { calories: { min: 301 } })).toBe(false);
    expect(matchesFilters(item, { calories: { max: 299 } })).toBe(false);
  });

  it('requires every supplied range to pass', () => {
    expect(matchesFilters(item, { calories: { max: 400 }, proteinG: { min: 25 } })).toBe(false);
    expect(matchesFilters(item, { calories: { max: 400 }, proteinG: { min: 15 } })).toBe(true);
  });
});

describe('searchFoods', () => {
  const library = [
    food('Chana masala', { calories: 310, proteinG: 12 }),
    food('Rajma chana salad', { calories: 180, proteinG: 9 }),
    food('Paneer butter masala', { calories: 420, proteinG: 18 }),
    food('Idli', { calories: 58, proteinG: 2 }),
  ];

  it('orders by relevance', () => {
    const results = searchFoods(library, 'chana');
    expect(results.map((f) => f.name)).toEqual(['Chana masala', 'Rajma chana salad']);
  });

  it('finds a dish typed with a different transliteration', () => {
    expect(searchFoods(library, 'panir').map((f) => f.name)).toEqual(['Paneer butter masala']);
  });

  it('matches query words in any order', () => {
    expect(searchFoods(library, 'masala paneer').map((f) => f.name)).toEqual([
      'Paneer butter masala',
    ]);
  });

  it('returns everything alphabetically for an empty query, so filters work alone', () => {
    const results = searchFoods(library, '');
    expect(results).toHaveLength(4);
    expect(results[0]!.name).toBe('Chana masala');
  });

  it('combines a query with nutrient filters', () => {
    const results = searchFoods(library, 'masala', { calories: { max: 350 } });
    expect(results.map((f) => f.name)).toEqual(['Chana masala']);
  });

  it('returns nothing when the query matches nothing', () => {
    expect(searchFoods(library, 'biryani')).toEqual([]);
  });
});

describe('proteinDensity', () => {
  const almonds = food('Almonds', { calories: 579, proteinG: 21 });
  const chicken = food('Chicken breast', { calories: 165, proteinG: 31 });

  /**
   * The reason sorting uses density rather than raw grams. By absolute protein
   * these two look comparable; per calorie they are not close, and per calorie
   * is what matters when hitting a protein target inside a calorie budget.
   */
  it('ranks chicken far above almonds despite similar protein', () => {
    expect(almonds.proteinG).toBeLessThan(chicken.proteinG * 1.5);
    expect(proteinDensity(chicken)).toBeGreaterThan(proteinDensity(almonds) * 4);
  });

  it('returns zero for a zero-calorie food rather than Infinity', () => {
    // A spice with a trace of protein must not head the list.
    expect(proteinDensity(food('Salt', { calories: 0, proteinG: 0.1 }))).toBe(0);
  });
});

describe('searchFoods sorting', () => {
  const library = [
    food('Almonds', { calories: 579, proteinG: 21 }),
    food('Chicken breast', { calories: 165, proteinG: 31 }),
    food('Cucumber', { calories: 15, proteinG: 0.7 }),
  ];

  it('sorts alphabetically by default', () => {
    expect(searchFoods(library, '').map((f) => f.name)).toEqual([
      'Almonds',
      'Chicken breast',
      'Cucumber',
    ]);
  });

  it('sorts by lowest calories', () => {
    expect(searchFoods(library, '', {}, 'calories').map((f) => f.name)).toEqual([
      'Cucumber',
      'Chicken breast',
      'Almonds',
    ]);
  });

  it('sorts by protein per calorie, not by raw protein', () => {
    const ranked = searchFoods(library, '', {}, 'proteinDensity').map((f) => f.name);
    expect(ranked[0]).toBe('Chicken breast');
    // Almonds have the second-highest raw protein but the worst density here.
    expect(ranked[ranked.length - 1]).toBe('Almonds');
  });

  it('keeps relevance ahead of sort while a query is active', () => {
    // Someone who typed "almonds" wants almonds, not whichever match is
    // leanest.
    const results = searchFoods(library, 'almonds', {}, 'proteinDensity');
    expect(results[0]!.name).toBe('Almonds');
  });

  it('makes a filter actionable by ranking within it', () => {
    const results = searchFoods(library, '', { proteinG: { min: 10 } }, 'proteinDensity');
    expect(results.map((f) => f.name)).toEqual(['Chicken breast', 'Almonds']);
  });
});
