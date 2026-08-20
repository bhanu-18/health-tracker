import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit config.
 *
 * `driver: 'expo'` makes generate emit a migrations.js bundle alongside the SQL,
 * which is what lets the app import migrations at build time -- React Native has
 * no filesystem to read .sql files from at runtime.
 */
export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
