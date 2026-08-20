/**
 * The health-data contract.
 *
 * iOS (HealthKit) and Android (Health Connect) have entirely different APIs, so
 * every screen talks to this interface instead of to either SDK. Swapping or
 * adding a platform means writing one new implementation, and changes no UI.
 *
 * ---------------------------------------------------------------------------
 * THE DEDUPLICATION RULE -- read before implementing a provider
 * ---------------------------------------------------------------------------
 * A user may have an Apple Watch, a phone, and a Fitbit syncing into the same
 * health store. The same 8,000 steps can therefore exist as three separate sets
 * of records. Summing raw samples across sources double- or triple-counts them.
 *
 * Both platforms expose an *aggregate* query that reconciles overlapping sources
 * into one correct total:
 *   - iOS:     HKStatisticsQuery / HKStatisticsCollectionQuery
 *   - Android: Health Connect's aggregate read APIs
 *
 * Every cumulative metric below (steps, active energy, sleep) MUST be read via
 * that aggregate query. Never fetch raw per-source samples and add them up in
 * JavaScript -- that bypasses the OS reconciliation and reintroduces the bug.
 *
 * Workout *sessions* are the deliberate exception: the OS does not merge them
 * the way it merges cumulative totals, so `readWorkouts` returns a plain list
 * and the UI displays it as a list. Any duplicate stays visible to the user
 * rather than being silently folded into a wrong total.
 *
 * Even done correctly this is not perfect: a device writing bad or missing
 * metadata can still skew a total. That is a platform limitation, not something
 * the app can fully solve.
 */

/** A calendar day, `YYYY-MM-DD`, in the user's local timezone. */
export type ISODate = string;

/**
 * Every metric is nullable on purpose.
 *
 * `null` means "we do not know" -- permission denied, watch not synced, or the
 * day has not happened. It is distinct from 0, which is a real measurement
 * meaning "you did nothing". Collapsing the two is the single easiest way to
 * make this app lie to its user, so the type system forbids it.
 */
export type DailyHealthMetrics = {
  date: ISODate;
  /** Deduplicated step total for the day. */
  steps: number | null;
  /** Deduplicated active energy burned, in kcal. */
  activeEnergyKcal: number | null;
  /** Deduplicated time asleep, in hours. */
  sleepHours: number | null;

  /**
   * When the most recent sample behind these figures was recorded.
   *
   * Not decoration. Data can arrive here through a long chain -- a band syncs
   * to its own app, that app writes to HealthKit, and only then can this app
   * read it. Each hop adds delay, and none of it is visible in the number
   * itself. Showing a total without saying how old it is presents a stale
   * reading as a current one.
   *
   * Null when nothing has been recorded for the day.
   */
  lastRecordedAt: Date | null;
};

export type WorkoutSession = {
  id: string;
  /** e.g. "Running", "Strength Training". Platform-specific labels, normalised. */
  activityType: string;
  startedAt: Date;
  durationMinutes: number;
  energyKcal: number | null;
  /**
   * Which app or device wrote this session. Shown in the UI precisely because
   * sessions are not deduplicated -- it lets the user recognise a duplicate.
   */
  sourceName: string;
};

/** What the app asks the OS for. Read-only: V1 never writes to the health store. */
export const HEALTH_PERMISSIONS = ['steps', 'activeEnergy', 'sleep', 'workouts'] as const;
export type HealthPermission = (typeof HEALTH_PERMISSIONS)[number];

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export interface HealthProvider {
  /** Human-readable name of the backing store, for Settings. */
  readonly name: string;

  /** Whether this device can provide health data at all. */
  isAvailable(): Promise<boolean>;

  /**
   * Prompt for read access.
   *
   * Note an Apple quirk: for privacy reasons HealthKit will report `denied` even
   * when permission was granted, for read-only scopes. Never gate the UI on this
   * result alone -- attempt the read and treat an empty result as "no data".
   */
  requestPermissions(): Promise<PermissionStatus>;

  getPermissionStatus(): Promise<PermissionStatus>;

  /** One day's cumulative metrics. MUST use the platform aggregate query. */
  readDailyMetrics(date: ISODate): Promise<DailyHealthMetrics>;

  /** Inclusive date range, for the history charts. MUST use aggregate queries. */
  readDailyMetricsRange(from: ISODate, to: ISODate): Promise<DailyHealthMetrics[]>;

  /** Workout sessions as an un-merged list. See the deduplication note above. */
  readWorkouts(from: ISODate, to: ISODate): Promise<WorkoutSession[]>;
}
