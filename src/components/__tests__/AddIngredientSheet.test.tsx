import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AddIngredientSheet } from '../AddIngredientSheet';

/**
 * Regression tests for two bugs that shipped.
 *
 * 1. The confirm button vanished. It was the last child of a flex:1 container
 *    that did not scroll, so it was clipped off the bottom and the sheet had no
 *    way to add anything at all. Typecheck and lint were both clean.
 * 2. Switching units kept the amount, so "100 g" became "100 cup" -- 100 cups
 *    of raw rice, displayed as 35,000 kcal without complaint.
 */

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../db/repositories/foods', () => ({
  getAllFoods: jest.fn(async () => [
    {
      id: 'ing-basmati-raw',
      name: 'Basmati rice, raw',
      nameNormalized: 'basmati rice raw',
      servingLabel: '100 g',
      servingGrams: 100,
      calories: 350,
      proteinG: 7.5,
      carbsG: 78,
      fatG: 0.9,
      source: 'seed',
      cuisine: 'Grain',
      // Dry rice: a known density, so volume units are offered. Not countable,
      // so "piece" is not.
      densityGPerMl: 0.85,
      isCountable: false,
      createdAt: 1,
    },
  ]),
}));

const selectBasmati = async () => {
  const onAdd = jest.fn();
  const view = await render(<AddIngredientSheet visible onCancel={jest.fn()} onAdd={onAdd} />);
  await waitFor(() => expect(view.getByText('Basmati rice, raw')).toBeTruthy());
  fireEvent.press(view.getByText('Basmati rice, raw'));
  await waitFor(() => expect(view.getByLabelText('Amount')).toBeTruthy());
  return { ...view, onAdd };
};

describe('AddIngredientSheet', () => {
  it('shows a confirm action once a food is chosen', async () => {
    const { getByText } = await selectBasmati();
    // The bug: this button existed in the source but was clipped out of view.
    expect(getByText('Add to recipe')).toBeTruthy();
  });

  it('defaults to the food serving weight in grams', async () => {
    const { getByLabelText, getByText } = await selectBasmati();
    expect(getByLabelText('Amount').props.value).toBe('100');
    // 100 g of a food stated per 100 g is exactly one serving.
    expect(getByText(/350 kcal/)).toBeTruthy();
  });

  it('resets the amount when the unit changes, rather than carrying it over', async () => {
    const { getByLabelText, getByText } = await selectBasmati();
    expect(getByLabelText('Amount').props.value).toBe('100');

    fireEvent.press(getByText('cup'));

    // Not 100 cups of rice.
    await waitFor(() => expect(getByLabelText('Amount').props.value).toBe('1'));
  });

  // The reported bug, at the UI level: rice has no pieces, so the control that
  // let a user ask for one should not exist.
  it('does not offer pieces for a food that cannot be counted', async () => {
    const { queryByText, getByText } = await selectBasmati();

    expect(getByText('g')).toBeTruthy();
    expect(getByText('cup')).toBeTruthy();
    expect(queryByText('piece')).toBeNull();
  });

  it('converts a cup through density rather than calling it one serving', async () => {
    const { getByText } = await selectBasmati();

    fireEvent.press(getByText('cup'));

    // 1 cup = 240 ml x 0.85 = 204 g of a 350 kcal/100 g food, so about 714.
    // It previously read 350 -- the serving figure, regardless of the unit.
    await waitFor(() => expect(getByText(/714 kcal/)).toBeTruthy());
  });

  it('passes the scaled nutrition up when confirmed', async () => {
    const { getByText, onAdd } = await selectBasmati();

    fireEvent.press(getByText('Add to recipe'));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(onAdd.mock.calls[0]![0]).toMatchObject({
      name: 'Basmati rice, raw',
      quantity: 100,
      unit: 'g',
      calories: 350,
    });
  });
});
