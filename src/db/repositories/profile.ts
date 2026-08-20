import { eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { profile, type Profile } from '../schema';

/**
 * The single-row profile.
 *
 * Every read goes through getProfile(), which creates the row if it is missing,
 * so no caller has to handle "the user has no profile yet" -- a state that only
 * exists between install and first launch.
 */

const PROFILE_ID = 1;

export async function getProfile(): Promise<Profile> {
  const [existing] = await db.select().from(profile).where(eq(profile.id, PROFILE_ID));
  if (existing) return existing;

  const [created] = await db.insert(profile).values({ id: PROFILE_ID }).returning();
  if (!created) throw new Error('Could not create the profile.');
  return created;
}

export type ProfileChanges = Partial<
  Pick<
    Profile,
    | 'dailyCalorieTarget'
    | 'dailyStepGoal'
    | 'sleepGoalHours'
    | 'goalWeightKg'
    | 'proteinTargetG'
    | 'carbsTargetG'
    | 'fatTargetG'
    | 'weightUnit'
  >
>;

export async function updateProfile(changes: ProfileChanges): Promise<Profile> {
  // Ensures the row exists before updating, so a first-run write is not a no-op.
  await getProfile();

  const [updated] = await db
    .update(profile)
    .set({ ...changes, updatedAt: sql`(unixepoch() * 1000)` })
    .where(eq(profile.id, PROFILE_ID))
    .returning();

  if (!updated) throw new Error('Could not save your settings.');
  return updated;
}
