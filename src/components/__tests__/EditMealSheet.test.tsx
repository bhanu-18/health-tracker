import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import type { FoodLogEntry } from '../../db/schema';
import { EditMealSheet } from '../EditMealSheet';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

/**
 * The log was append-only until this sheet existed: one mistap put three
 * servings of biryani in your history permanently. A log that cannot be
 * corrected stops being trusted, and then stops being kept.
 */
const entry = (over: Partial<FoodLogEntry> = {}): FoodLogEntry =>
  ({
    id: 'e1',
    date: '2026-08-20',
    slot: 'lunch',
    name: 'Chana masala',
    servings: 2,
    // Stored pre-scaled: 2 servings of a 310 kcal dish.
    calories: 620,
    proteinG: 24,
    carbsG: 80,
    fatG: 18,
    foodId: null,
    recipeId: null,
    loggedAt: 1,
    ...over,
  }) as FoodLogEntry;

describe('EditMealSheet', () => {
  it('renders nothing without an entry', async () => {
    const { toJSON } = await render(
      <EditMealSheet entry={null} onCancel={jest.fn()} onSave={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  /**
   * Nutrition is stored already multiplied by servings, so the per-serving
   * figure has to be recovered by dividing. Showing the stored total as the
   * per-serving value would double every number on screen.
   */
  it('recovers the per-serving figure from a pre-scaled entry', async () => {
    const { getByText } = await render(
      <EditMealSheet
        entry={entry()}
        onCancel={jest.fn()}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(getByText(/310 kcal a serving/)).toBeTruthy();
  });

  it('starts at the servings already logged', async () => {
    const { getByText } = await render(
      <EditMealSheet
        entry={entry()}
        onCancel={jest.fn()}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    // 2 servings of 310 is the current total, so no change is offered yet.
    expect(getByText('620 kcal')).toBeTruthy();
  });

  it('projects the new total as the portion changes', async () => {
    const { getByText, getByLabelText } = await render(
      <EditMealSheet
        entry={entry()}
        onCancel={jest.fn()}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(getByLabelText('1 servings'));

    await waitFor(() => expect(getByText('310 kcal')).toBeTruthy());
    // The previous value stays visible, so the change is legible.
    expect(getByText('was 620 kcal')).toBeTruthy();
  });

  it('saves the chosen portion', async () => {
    const onSave = jest.fn();
    const { getByText, getByLabelText } = await render(
      <EditMealSheet entry={entry()} onCancel={jest.fn()} onSave={onSave} onDelete={jest.fn()} />,
    );

    fireEvent.press(getByLabelText('0.5 servings'));
    await waitFor(() => expect(getByText('155 kcal')).toBeTruthy());

    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledWith(0.5);
  });

  it('offers removal', async () => {
    const onDelete = jest.fn();
    const { getByLabelText } = await render(
      <EditMealSheet entry={entry()} onCancel={jest.fn()} onSave={jest.fn()} onDelete={onDelete} />,
    );

    fireEvent.press(getByLabelText('Remove this meal'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not divide by zero on a malformed entry', async () => {
    const { getByText } = await render(
      <EditMealSheet
        entry={entry({ servings: 0, calories: 310 })}
        onCancel={jest.fn()}
        onSave={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(getByText(/310 kcal a serving/)).toBeTruthy();
  });
});
