import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { createFood } from '../../src/db/repositories/foods';
import NewFoodScreen from '../foods/new';

/**
 * Without this screen the app only worked for the foods that shipped with it.
 * These assert what actually reaches the database, because a wrong serving
 * weight or a missing countable flag is not visible afterwards -- it just makes
 * units quietly unavailable.
 */

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/db/repositories/foods', () => ({
  createFood: jest.fn(async () => ({ id: 'new' })),
}));

/**
 * Type into fields one at a time, awaiting each.
 *
 * Firing them synchronously leaves a burst of concurrent renders in flight that
 * outlives the test and disrupts the next one's mount -- the same failure the
 * food screen's two back-to-back chip presses caused.
 */
const fill = async (
  getByLabelText: (label: string) => { props: Record<string, unknown> },
  values: Record<string, string>,
) => {
  for (const [label, value] of Object.entries(values)) {
    fireEvent.changeText(getByLabelText(label) as never, value);
    await waitFor(() => expect(getByLabelText(label).props.value).toBe(value));
  }
};

beforeEach(() => {
  (createFood as jest.Mock).mockClear();
});

describe('NewFoodScreen', () => {
  it('saves a weighed food with its nutrition', async () => {
    const { getByLabelText, getByText } = await render(<NewFoodScreen />);

    await fill(getByLabelText, {
      Name: 'Greek yogurt',
      Serving: '100 g',
      'Serving weight': '100',
      Calories: '59',
      Protein: '10',
      Carbs: '3.6',
      Fat: '0.4',
    });
    fireEvent.press(getByText('Save food'));

    await waitFor(() => expect(createFood).toHaveBeenCalledTimes(1));
    expect((createFood as jest.Mock).mock.calls[0]![0]).toMatchObject({
      name: 'Greek yogurt',
      servingGrams: 100,
      calories: 59,
      proteinG: 10,
      isCountable: false,
      // No cup weight given, so volume units stay unavailable rather than
      // being guessed.
      densityGPerMl: null,
    });

    // Saving flips a flag, awaits the write and clears the flag in a finally.
    // Awaiting the label's return proves the whole chain finished inside this
    // test, rather than landing during the next one's mount.
    await waitFor(() => expect(getByText('Save food')).toBeTruthy());
  });

  it('derives density from the weight of a cup', async () => {
    const { getByLabelText, getByText } = await render(<NewFoodScreen />);

    await fill(getByLabelText, {
      Name: 'Rolled oats',
      'Serving weight': '100',
      'Weight of 1 cup (optional)': '96',
      Calories: '389',
    });
    fireEvent.press(getByText('Save food'));

    await waitFor(() => expect(createFood).toHaveBeenCalled());
    // 96 g per 240 ml cup = 0.4 g/ml, which is what oats actually are.
    expect((createFood as jest.Mock).mock.calls[0]![0].densityGPerMl).toBeCloseTo(0.4, 3);

    // Saving flips a flag, awaits the write and clears the flag in a finally.
    // Awaiting the label's return proves the whole chain finished inside this
    // test, rather than landing during the next one's mount.
    await waitFor(() => expect(getByText('Save food')).toBeTruthy());
  });

  /**
   * The failure mode worth guarding: a food with neither a weight nor a count
   * cannot be measured in any unit, so it would be saved and then be unusable
   * in a recipe, with nothing explaining why.
   */
  it('refuses a food that could not be measured at all', async () => {
    const { getByLabelText, getByText } = await render(<NewFoodScreen />);

    await fill(getByLabelText, { Name: 'Mystery', Calories: '100' });
    fireEvent.press(getByText('Save food'));

    await waitFor(() => expect(getByText(/cannot be measured/)).toBeTruthy());
    expect(createFood).not.toHaveBeenCalled();
  });

  it('requires a name and calories', async () => {
    const { getByText } = await render(<NewFoodScreen />);

    fireEvent.press(getByText('Save food'));

    await waitFor(() => expect(getByText(/Give the food a name/)).toBeTruthy());
    expect(createFood).not.toHaveBeenCalled();
  });

  it('warns when macros disagree with the stated calories', async () => {
    const { getByLabelText, getByText } = await render(<NewFoodScreen />);

    // 12 g protein, 40 g carbs and 9 g fat imply about 289 kcal, not 31.
    await fill(getByLabelText, {
      Name: 'Typo',
      'Serving weight': '100',
      Calories: '31',
      Protein: '12',
      Carbs: '40',
      Fat: '9',
    });

    await waitFor(() => expect(getByText(/work out to about 289 kcal/)).toBeTruthy());
  });
});
