import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { newId } from '../ids';
import { weightEntries, type WeightEntryRow } from '../schema';

/**
 * Weight reads and writes. Always kilograms -- see src/lib/units.ts.
 */

export async function getAllWeightEntries(): Promise<WeightEntryRow[]> {
  return db.select().from(weightEntries).orderBy(weightEntries.date);
}

export async function getRecentWeightEntries(limit = 90): Promise<WeightEntryRow[]> {
  const rows = await db.select().from(weightEntries).orderBy(desc(weightEntries.date)).limit(limit);
  // Query descending to get the newest, return ascending so charts plot
  // left-to-right without the caller having to re-sort.
  return rows.reverse();
}

export async function getLatestWeight(): Promise<WeightEntryRow | undefined> {
  const [row] = await db.select().from(weightEntries).orderBy(desc(weightEntries.date)).limit(1);
  return row;
}

/**
 * Record a weight for a day.
 *
 * One reading per day wins: weighing twice replaces the earlier value rather
 * than adding a second point, because two readings on one day are the same
 * measurement taken twice, and averaging them into the trend would weight that
 * day double.
 */
export async function logWeight(date: string, kg: number): Promise<void> {
  const [existing] = await db
    .select({ id: weightEntries.id })
    .from(weightEntries)
    .where(sql`${weightEntries.date} = ${date} and ${weightEntries.source} = 'manual'`)
    .limit(1);

  if (existing) {
    await db
      .update(weightEntries)
      .set({ kg, loggedAt: sql`(unixepoch() * 1000)` })
      .where(eq(weightEntries.id, existing.id));
    return;
  }

  await db.insert(weightEntries).values({ id: newId(), date, kg, source: 'manual' });
}

export async function deleteWeightEntry(id: string): Promise<void> {
  await db.delete(weightEntries).where(eq(weightEntries.id, id));
}

/**
 * Import readings from HealthKit.
 *
 * Idempotent via `externalId`: the same sample re-imported is skipped rather
 * than duplicated, which matters because import runs on every launch and a
 * duplicate would silently double-weight that day in the trend.
 */
export async function importWeightSamples(
  samples: readonly { externalId: string; date: string; kg: number }[],
): Promise<number> {
  let imported = 0;

  for (const sample of samples) {
    const result = await db
      .insert(weightEntries)
      .values({
        id: newId(),
        date: sample.date,
        kg: sample.kg,
        source: 'healthkit',
        externalId: sample.externalId,
      })
      .onConflictDoNothing();

    // Drizzle reports affected rows; a conflict means it already existed.
    if ((result as { changes?: number }).changes !== 0) imported += 1;
  }

  return imported;
}
