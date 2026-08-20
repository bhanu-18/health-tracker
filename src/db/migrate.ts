import { useMigrations as useDrizzleMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../../drizzle/migrations';
import { db } from './client';

/**
 * Runs any pending migrations on app start.
 *
 * The migrations are imported as a compiled bundle rather than read from disk:
 * React Native has no filesystem to load .sql files from at runtime, which is
 * why drizzle.config.ts sets `driver: 'expo'` to emit that bundle.
 *
 * Regenerate after any schema change:
 *   npx drizzle-kit generate --name <what_changed>
 */
export function useMigrations(): { success: boolean; error?: Error } {
  return useDrizzleMigrations(db, migrations);
}
