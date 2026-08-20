import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

/**
 * The app's SQLite connection.
 *
 * Opened synchronously at module load so the database handle exists before any
 * screen mounts. That is safe here because expo-sqlite's sync open is a local
 * file operation, and it avoids every consumer having to await a connection.
 */
const DATABASE_NAME = 'health-tracker.db';

export const sqliteDb = openDatabaseSync(DATABASE_NAME, {
  // Lets Drizzle's live-query hooks re-run automatically when rows change,
  // rather than every screen having to refetch by hand after a write.
  enableChangeListener: true,
});

export const db = drizzle(sqliteDb, { schema });

export type Database = typeof db;

/**
 * Foreign keys are OFF by default in SQLite, per its own compatibility rules.
 * Without this the ON DELETE clauses in the schema are silently ignored, and
 * deleting a recipe would leave its ingredients behind as orphans.
 */
export function enableForeignKeys(): void {
  sqliteDb.execSync('PRAGMA foreign_keys = ON;');
}

enableForeignKeys();
