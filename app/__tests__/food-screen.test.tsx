import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { findFoodCandidates } from '../../src/db/repositories/foods';
import { getUsualMeals, recordUsualMealUse } from '../../src/db/repositories/usualMeals';
import FoodScreen from '../(tabs)/food';

/**
 * Covers the logging path end to end at the UI level: search narrows results,
 * a usual meal logs in one tap, and picking a food opens the portion sheet.
 *
 * Repositories are mocked (they open expo-sqlite, which has no Node build), but
 * the real search ranking, the real store and the real components all run.
 */

const mockLogMeal = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const FOODS = [
  {
    id: 'f1',
    name: 'Chana masala',
    nameNormalized: 'chana masala',
    servingLabel: '1 cup (200 g)',
    servingGrams: 200,
    calories: 310,
    proteinG: 12,
    carbsG: 40,
    fatG: 9,
    source: 'seed',
    cuisine: 'North Indian',
    createdAt: 1,
  },
  {
    id: 'f2',
    name: 'Idli',
    nameNormalized: 'idli',
    servingLabel: '1 piece (40 g)',
    servingGrams: 40,
    calories: 58,
    proteinG: 1.6,
    carbsG: 12,
    fatG: 0.2,
    source: 'seed',
    cuisine: 'South Indian',
    createdAt: 1,
  },
];

jest.mock('../../src/db/repositories/foods', () => ({
  getAllFoods: jest.fn(async () => FOODS),
  findFoodCandidates: jest.fn(async () => FOODS),
}));

/** The food rows, in the order the screen renders them. */
const renderedOrder = (
  getAllByTestId: (matcher: RegExp) => { props: Record<string, unknown> }[],
): string[] => {
  try {
    return getAllByTestId(/^food-row-/).map((node) =>
      String(node.props.testID).replace('food-row-', ''),
    );
  } catch {
    // getAllBy* throws when nothing matches; an empty list is the useful answer.
    return [];
  }
};

jest.mock('../../src/db/repositories/usualMeals', () => ({
  getUsualMeals: jest.fn(async () => [
    {
      id: 'u1',
      label: null,
      foodId: 'f2',
      recipeId: null,
      servings: 2,
      slot: 'breakfast',
      useCount: 5,
      lastUsedAt: 1,
      createdAt: 1,
      displayName: 'Idli',
      calories: 58,
      proteinG: 1.6,
      carbsG: 12,
      fatG: 0.2,
    },
  ]),
  addUsualMeal: jest.fn(),
  recordUsualMealUse: jest.fn(),
}));

jest.mock('../../src/stores/foodLog', () => ({
  useFoodLog: (selector: (s: unknown) => unknown) => selector({ logMeal: mockLogMeal }),
}));

beforeEach(() => {
  // Call history only -- clearing implementations too would leave the mocked
  // repositories returning undefined and the screen rendering against no data.
  mockLogMeal.mockClear();
  (getUsualMeals as jest.Mock).mockClear();
  (recordUsualMealUse as jest.Mock).mockClear();
  (findFoodCandidates as jest.Mock).mockClear();
});

describe('FoodScreen', () => {
  it('lists usual meals above search results', async () => {
    const { getByText } = await render(<FoodScreen />);
    await waitFor(() => expect(getByText('Your usual meals')).toBeTruthy());
    expect(getByText('Chana masala')).toBeTruthy();
  });

  it('scales a usual meal by its saved portion when logged in one tap', async () => {
    const { getByText, getAllByText } = await render(<FoodScreen />);
    await waitFor(() => expect(getByText('Your usual meals')).toBeTruthy());

    // The usual is 2 servings of a 58 kcal idli, so it must show 116, not 58.
    expect(getByText('116 kcal')).toBeTruthy();

    fireEvent.press(getAllByText('Idli')[0]!);

    await waitFor(() => expect(mockLogMeal).toHaveBeenCalledTimes(1));
    expect(mockLogMeal.mock.calls[0]![0]).toMatchObject({
      name: 'Idli',
      servings: 2,
      calories: 116,
      slot: 'breakfast',
    });

    // Logging a usual bumps its use count and reloads the list; await that so
    // the state update lands inside the test.
    await waitFor(() => expect(recordUsualMealUse).toHaveBeenCalledWith('u1'));
    await waitFor(() => expect(getUsualMeals).toHaveBeenCalledTimes(2));
  });

  it('filters results by the search query using the real ranking', async () => {
    const { getByPlaceholderText, getByText, queryByText } = await render(<FoodScreen />);
    await waitFor(() => expect(getByText('Chana masala')).toBeTruthy());

    // A deliberate misspelling: it must still match via normalisation.
    fireEvent.changeText(getByPlaceholderText('Search foods'), 'channa');

    await waitFor(() => expect(queryByText('Idli')).toBeNull());
    expect(getByText('Chana masala')).toBeTruthy();

    // A query of two or more characters also re-queries the database. Wait for
    // that to land inside the test, so its state update is not left to fire
    // after teardown -- which React warns about and which would mask genuine
    // warnings later.
    await waitFor(() => expect(findFoodCandidates).toHaveBeenCalledWith('channa'));
  });

  /**
   * Regression test for a sort control wired to nothing.
   *
   * The chips rendered, highlighted on tap and updated their state -- and the
   * state was never read, because the sort argument was missing from the
   * searchFoods call. Every order looked alphabetical. Typecheck and lint were
   * clean, because passing three arguments to a function whose fourth is
   * optional is perfectly valid TypeScript.
   *
   * Asserting that the order CHANGES is the only thing that catches this. A
   * test that merely renders the chips would have passed throughout.
   */
  it('reorders results when a sort is chosen', async () => {
    const { getByText, getAllByTestId } = await render(<FoodScreen />);
    await waitFor(() => expect(getByText('Chana masala')).toBeTruthy());

    // f1 = Chana masala (310 kcal), f2 = Idli (58 kcal). Alphabetical first.
    expect(renderedOrder(getAllByTestId)).toEqual(['f1', 'f2']);

    fireEvent.press(getByText('Lowest calories'));

    await waitFor(() => expect(renderedOrder(getAllByTestId)).toEqual(['f2', 'f1']));

    // Let the screen's own loads finish inside this test. Left pending, they
    // resolve during the next test's mount and interfere with its render.
    await waitFor(() => expect(getUsualMeals).toHaveBeenCalled());
  });

  it('ranks by protein per calorie rather than raw protein', async () => {
    const { getByText, getAllByTestId } = await render(<FoodScreen />);
    await waitFor(() => expect(getByText('Chana masala')).toBeTruthy());

    fireEvent.press(getByText('Most protein per kcal'));

    // Idli: 1.6 g over 58 kcal = 2.8 per 100 kcal.
    // Chana masala: 12 g over 310 kcal = 3.9 per 100 kcal, so it ranks first.
    await waitFor(() => expect(renderedOrder(getAllByTestId)).toEqual(['f1', 'f2']));

    // Let the screen's own loads finish inside this test. Left pending, they
    // resolve during the next test's mount and interfere with its render.
    await waitFor(() => expect(getUsualMeals).toHaveBeenCalled());
  });

  it('applies the sort within an active filter', async () => {
    const { getByText, getAllByTestId } = await render(<FoodScreen />);
    await waitFor(() => expect(getByText('Chana masala')).toBeTruthy());

    fireEvent.press(getByText('Under 300'));
    // Let the filter land before applying the sort. Firing both synchronously
    // leaves concurrent renders in flight past the end of the test.
    await waitFor(() => expect(renderedOrder(getAllByTestId)).toEqual(['f2']));

    fireEvent.press(getByText('Lowest calories'));

    // Only idli survives the filter, and the sort must not resurrect the other.
    await waitFor(() => expect(renderedOrder(getAllByTestId)).toEqual(['f2']));

    // Let the screen's own loads finish inside this test. Left pending, they
    // resolve during the next test's mount and interfere with its render.
    await waitFor(() => expect(getUsualMeals).toHaveBeenCalled());
  });

  it('opens the portion sheet when a food is chosen', async () => {
    const { getByText, getAllByText } = await render(<FoodScreen />);
    await waitFor(() => expect(getByText('Chana masala')).toBeTruthy());

    // One "310 kcal" exists in the list row before the sheet opens.
    expect(getAllByText('310 kcal')).toHaveLength(1);

    fireEvent.press(getByText('Chana masala'));

    // The sheet shows the serving label and a default one-serving total, so the
    // figure now appears twice -- in the row behind, and in the sheet.
    await waitFor(() => expect(getByText('1 cup (200 g)')).toBeTruthy());
    expect(getAllByText('310 kcal')).toHaveLength(2);
  });
});
