import { create } from 'zustand';

/**
 * User profile and goals.
 *
 * Defaults are placeholders until the Settings screen writes real values.
 * Kept separate from the food log because these change rarely and are read by
 * almost every screen.
 */
type ProfileState = {
  /** kcal per day. */
  calorieTarget: number;
  stepGoal: number;
  sleepGoalHours: number;
  goalWeightKg: number | null;
  setCalorieTarget: (kcal: number) => void;
  setStepGoal: (steps: number) => void;
  setGoalWeight: (kg: number | null) => void;
};

export const useProfile = create<ProfileState>((set) => ({
  calorieTarget: 2000,
  stepGoal: 10_000,
  sleepGoalHours: 8,
  goalWeightKg: 75,
  setCalorieTarget: (calorieTarget) => set({ calorieTarget }),
  setStepGoal: (stepGoal) => set({ stepGoal }),
  setGoalWeight: (goalWeightKg) => set({ goalWeightKg }),
}));
