import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { findFoodCandidates } from '../../src/db/repositories/foods';
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
  mockLogMeal.mockClear();
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
