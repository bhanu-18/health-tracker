import { create } from 'zustand';
import { getProfile, updateProfile, type ProfileChanges } from '../db/repositories/profile';
import type { Profile } from '../db/schema';
import type { WeightUnit } from '../lib/units';

/**
 * User profile and goals, backed by SQLite.
 *
 * Loaded once at app start and kept in memory: these values are read by nearly
 * every screen and change rarely, so re-querying on each render would be pure
 * overhead. Writes go to the database first, then update the cache.
 */
type ProfileState = {
  profile: Profile | null;
  isLoading: boolean;

  load: () => Promise<void>;
  update: (changes: ProfileChanges) => Promise<void>;
};

export const useProfile = create<ProfileState>((set) => ({
  profile: null,
  isLoading: true,

  load: async () => {
    set({ isLoading: true });
    const loaded = await getProfile();
    set({ profile: loaded, isLoading: false });
  },

  update: async (changes) => {
    const updated = await updateProfile(changes);
    set({ profile: updated });
  },
}));

/**
 * Defaults for the window between app start and the profile loading.
 *
 * Returning these rather than null keeps every screen free of "if profile is
 * null" branches, and they match the column defaults in the schema, so the
 * numbers never visibly jump when the real row arrives.
 */
export const DEFAULT_PROFILE = {
  dailyCalorieTarget: 2000,
  dailyStepGoal: 10000,
  sleepGoalHours: 8,
  goalWeightKg: null as number | null,
  weightUnit: 'kg' as WeightUnit,
};

export function selectCalorieTarget(state: ProfileState): number {
  return state.profile?.dailyCalorieTarget ?? DEFAULT_PROFILE.dailyCalorieTarget;
}

export function selectStepGoal(state: ProfileState): number {
  return state.profile?.dailyStepGoal ?? DEFAULT_PROFILE.dailyStepGoal;
}

export function selectWeightUnit(state: ProfileState): WeightUnit {
  return (state.profile?.weightUnit as WeightUnit) ?? DEFAULT_PROFILE.weightUnit;
}

export function selectGoalWeightKg(state: ProfileState): number | null {
  return state.profile?.goalWeightKg ?? DEFAULT_PROFILE.goalWeightKg;
}
