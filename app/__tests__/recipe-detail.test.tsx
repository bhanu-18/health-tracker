import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import RecipeDetailScreen from '../recipes/[id]';

/**
 * The recipe screen is the product's actual claim: exact ingredient amounts in,
 * a trustworthy per-serving figure out. These assert the numbers the user reads
 * come from the stored recipe rather than anything re-derived in the view.
 */

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'r1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  // Run the focus callback once, like a real focus event on mount.
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = jest.requireActual('react');
    React.useEffect(() => callback(), []);
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/stores/foodLog', () => ({
  useFoodLog: (selector: (s: unknown) => unknown) => selector({ logMeal: jest.fn() }),
}));

// Chana masala: the worked example from the spec, serving 4 at 310 kcal.
jest.mock('../../src/db/repositories/recipes', () => ({
  getRecipe: jest.fn(async () => ({
    id: 'r1',
    name: 'Chana masala',
    nameNormalized: 'chana masala',
    serves: 4,
    notes: null,
    cuisine: 'North Indian',
    caloriesPerServing: 310,
    proteinPerServingG: 9.9,
    carbsPerServingG: 33.2,
    fatPerServingG: 16.3,
    source: 'user',
    createdAt: 1,
    updatedAt: 1,
    ingredients: [
      {
        id: 'i1',
        recipeId: 'r1',
        foodId: 'f1',
        name: 'Chickpeas, dried',
        quantity: 400,
        unit: 'g',
        calories: 656,
        proteinG: 35.6,
        carbsG: 109.6,
        fatG: 10.4,
        sortOrder: 0,
      },
      {
        id: 'i2',
        recipeId: 'r1',
        foodId: 'f2',
        name: 'Onion',
        quantity: 1,
        unit: 'piece',
        calories: 44,
        proteinG: 1.2,
        carbsG: 10.3,
        fatG: 0.1,
        sortOrder: 1,
      },
    ],
  })),
  addIngredient: jest.fn(),
  removeIngredient: jest.fn(),
}));

jest.mock('../../src/db/repositories/foods', () => ({
  getAllFoods: jest.fn(async () => []),
}));

describe('RecipeDetailScreen', () => {
  it('shows the per-serving figure and the serving count it came from', async () => {
    const { getByText } = await render(<RecipeDetailScreen />);

    await waitFor(() => expect(getByText('Chana masala')).toBeTruthy());
    expect(getByText('310')).toBeTruthy();
    expect(getByText('kcal per serving')).toBeTruthy();
    expect(getByText('Serves 4')).toBeTruthy();
  });

  // The differentiator: exact amounts, not "about a cup".
  it('lists every ingredient with its exact amount', async () => {
    const { getByText } = await render(<RecipeDetailScreen />);

    await waitFor(() => expect(getByText('Chickpeas, dried')).toBeTruthy());
    expect(getByText('400 g')).toBeTruthy();
    expect(getByText('Onion')).toBeTruthy();
    expect(getByText('1 piece')).toBeTruthy();
  });

  it('offers to log a serving once ingredients exist', async () => {
    const { getByText } = await render(<RecipeDetailScreen />);
    await waitFor(() => expect(getByText('Log one serving')).toBeTruthy());
  });
});
