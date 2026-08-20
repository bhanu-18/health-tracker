import {
  authorizationStatusFor,
  AuthorizationStatus,
  CategoryValueSleepAnalysis,
  isHealthDataAvailable,
  queryCategorySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  WorkoutActivityType,
} from '@kingstinct/react-native-healthkit';
import { totalCoveredHours, type Interval } from '../../lib/intervals';
import { activityName } from '../../lib/workoutActivity';
import type {
  DailyHealthMetrics,
  HealthProvider,
  ISODate,
  PermissionStatus,
  WorkoutSession,
} from './types';

/**
 * HealthKit implementation of HealthProvider. iOS only.
 *
 * Read the deduplication note at the top of ./types.ts before changing anything
 * in this file -- the query choices here are the reason totals are correct.
 */

/** Read-only. V1 never writes to HealthKit, so `toShare` is deliberately empty. */
const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKWorkoutTypeIdentifier',
] as const;

/** Local-midnight bounds for a calendar day, matching how the app keys data. */
function dayBounds(date: ISODate): { startDate: Date; endDate: Date } {
  const parts = date.split('-').map(Number);
  const [year, month, day] = [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
  return {
    startDate: new Date(year, month - 1, day, 0, 0, 0, 0),
    endDate: new Date(year, month - 1, day, 23, 59, 59, 999),
  };
}

/**
 * Sleep is attributed to the day you wake up, so the query window runs from
 * 6pm the previous evening to 11am on the given day. Querying midnight-to-
 * midnight would cut a normal night in half and report roughly the hours slept
 * after 00:00 only.
 */
function sleepWindow(date: ISODate): { startDate: Date; endDate: Date } {
  const parts = date.split('-').map(Number);
  const [year, month, day] = [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
  return {
    startDate: new Date(year, month - 1, day - 1, 18, 0, 0, 0),
    endDate: new Date(year, month - 1, day, 11, 0, 0, 0),
  };
}

/** Category values that mean "actually asleep". `inBed` and `awake` are excluded. */
const ASLEEP_VALUES = new Set<number>([
  CategoryValueSleepAnalysis.asleepUnspecified,
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
]);

/**
 * Which category values belong to each reported stage.
 *
 * `asleepUnspecified` is deliberately absent: a source that records only
 * "asleep" with no stage detail contributes to the total but cannot be
 * attributed to deep, core or REM, and inventing an attribution would be
 * making data up.
 */
const STAGE_VALUES = {
  deep: [CategoryValueSleepAnalysis.asleepDeep],
  core: [CategoryValueSleepAnalysis.asleepCore],
  rem: [CategoryValueSleepAnalysis.asleepREM],
  // `awake` is 2 in HealthKit's enum -- brief wakings inside a night.
  awake: [2],
} as const;

export class HealthKitProvider implements HealthProvider {
  readonly name = 'Apple Health';

  /**
   * Memoised authorisation request.
   *
   * Reads silently return nothing until HealthKit has been asked for access, so
   * every read path goes through this first. Keeping it here rather than in a
   * screen means no caller can forget -- which is exactly the bug that shipped
   * the first time: requestPermissions() existed and nothing ever called it, so
   * the dashboard showed "No data" and iOS never even prompted.
   *
   * The promise is stored, not the result, so concurrent first reads share one
   * prompt instead of stacking several permission sheets.
   */
  private authorization: Promise<void> | null = null;

  private ensureAuthorized(): Promise<void> {
    if (!this.authorization) {
      this.authorization = requestAuthorization({ toRead: READ_TYPES, toShare: [] })
        .then(() => undefined)
        // A rejection here means the prompt failed, not that access was denied.
        // Reads still run and return null, which the UI renders as "no data".
        .catch(() => undefined);
    }
    return this.authorization;
  }

  async isAvailable(): Promise<boolean> {
    return isHealthDataAvailable();
  }

  async requestPermissions(): Promise<PermissionStatus> {
    if (!isHealthDataAvailable()) return 'unavailable';
    await this.ensureAuthorized();
    return this.getPermissionStatus();
  }

  /**
   * Apple deliberately does not reveal whether *read* access was granted -- that
   * would leak which conditions a user tracks. `authorizationStatusFor` reports
   * only whether we have asked yet, so a granted read scope still reads back as
   * `sharingDenied`.
   *
   * So this reports 'undetermined' vs 'granted' as "have we prompted", and the
   * caller must judge real access by attempting a read. An empty result means
   * "no data", which may be a denial or may be a genuinely empty day -- the two
   * are indistinguishable by design.
   */
  async getPermissionStatus(): Promise<PermissionStatus> {
    if (!isHealthDataAvailable()) return 'unavailable';
    const status = authorizationStatusFor('HKQuantityTypeIdentifierStepCount');
    return status === AuthorizationStatus.notDetermined ? 'undetermined' : 'granted';
  }

  async readDailyMetrics(date: ISODate): Promise<DailyHealthMetrics> {
    await this.ensureAuthorized();

    // Run independently so one failing metric cannot blank the whole dashboard.
    const [steps, activeEnergyKcal, sleep, restingHeartRate, lastRecordedAt] = await Promise.all([
      this.readSteps(date),
      this.readActiveEnergy(date),
      this.readSleep(date),
      this.readRestingHeartRate(date),
      this.readLastRecordedAt(date),
    ]);
    return {
      date,
      steps,
      activeEnergyKcal,
      sleepHours: sleep.totalHours,
      sleepStages: sleep.stages,
      restingHeartRate,
      lastRecordedAt,
    };
  }

  /**
   * Resting heart rate, averaged over the day.
   *
   * `discreteAverage` rather than a sum: this is a rate, and adding two
   * readings of 58 bpm would produce a meaningless 116.
   */
  private async readRestingHeartRate(date: ISODate): Promise<number | null> {
    try {
      const result = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierRestingHeartRate',
        ['discreteAverage'],
        { filter: { date: dayBounds(date) }, unit: 'count/min' },
      );
      const average = result.averageQuantity?.quantity;
      return average == null ? null : Math.round(average);
    } catch (cause) {
      warnReadFailed('restingHeartRate', cause);
      return null;
    }
  }

  /**
   * When the most recent step sample was written.
   *
   * Steps are the proxy for the whole day's freshness: they are the most
   * continuously recorded metric, so if steps are current the sync is current.
   * Asking for 'mostRecent' alongside the sum costs no extra query.
   */
  private async readLastRecordedAt(date: ISODate): Promise<Date | null> {
    try {
      const result = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierStepCount',
        ['mostRecent'],
        { filter: { date: dayBounds(date) }, unit: 'count' },
      );
      return result.mostRecentQuantityDateInterval?.to ?? null;
    } catch (cause) {
      warnReadFailed('lastRecordedAt', cause);
      return null;
    }
  }

  async readDailyMetricsRange(from: ISODate, to: ISODate): Promise<DailyHealthMetrics[]> {
    // Sequential rather than a statistics *collection* query, because sleep has
    // no collection equivalent and would need per-day work regardless.
    // TODO: move steps and energy to queryStatisticsCollectionForQuantity once
    // the history charts need more than a couple of weeks at a time.
    const { dateRange } = await import('../../lib/dates');
    const days = dateRange(from, to);
    return Promise.all(days.map((day) => this.readDailyMetrics(day)));
  }

  /**
   * Steps via HKStatisticsQuery -- the OS reconciles Watch, iPhone and any
   * third-party source into one total. Summing raw samples here would
   * double-count, which is the bug this whole design exists to avoid.
   */
  private async readSteps(date: ISODate): Promise<number | null> {
    try {
      const result = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierStepCount',
        ['cumulativeSum'],
        { filter: { date: dayBounds(date) }, unit: 'count' },
      );
      const sum = result.sumQuantity?.quantity;
      return sum == null ? null : Math.round(sum);
    } catch (cause) {
      // A throw means the read failed. Null keeps that distinct from a real 0,
      // but swallowing the cause silently makes "no data" undebuggable -- so
      // the reason is always logged.
      warnReadFailed('steps', cause);
      return null;
    }
  }

  /** Active energy via HKStatisticsQuery, for the same deduplication reason. */
  private async readActiveEnergy(date: ISODate): Promise<number | null> {
    try {
      const result = await queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        ['cumulativeSum'],
        { filter: { date: dayBounds(date) }, unit: 'kcal' },
      );
      const sum = result.sumQuantity?.quantity;
      return sum == null ? null : Math.round(sum);
    } catch (cause) {
      warnReadFailed('activeEnergy', cause);
      return null;
    }
  }

  /**
   * Sleep has no statistics query, because it is a category type. We therefore
   * fetch the raw samples and deduplicate them ourselves by taking the union of
   * their intervals -- see src/lib/intervals.ts.
   *
   * This is the one place the app does its own deduplication, and it is not a
   * violation of the rule in types.ts: that rule forbids *summing* raw samples,
   * which is exactly what a union avoids.
   */
  private async readSleep(
    date: ISODate,
  ): Promise<{ totalHours: number | null; stages: DailyHealthMetrics['sleepStages'] }> {
    try {
      const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        filter: { date: sleepWindow(date) },
        limit: 0,
        ascending: true,
      });

      if (samples.length === 0) return { totalHours: null, stages: null };

      const intervalsFor = (values: readonly number[]): Interval[] =>
        samples
          .filter((sample) => values.includes(sample.value as number))
          .map((sample) => ({ start: sample.startDate, end: sample.endDate }));

      const asleep = intervalsFor([...ASLEEP_VALUES]);

      // Each stage is unioned independently, for the same reason the total is:
      // two sources recording the same stretch must count it once.
      const deepHours = totalCoveredHours(intervalsFor(STAGE_VALUES.deep));
      const coreHours = totalCoveredHours(intervalsFor(STAGE_VALUES.core));
      const remHours = totalCoveredHours(intervalsFor(STAGE_VALUES.rem));
      const awakeHours = totalCoveredHours(intervalsFor(STAGE_VALUES.awake));

      const hasStageDetail = deepHours + coreHours + remHours > 0;

      // Samples existed but none meant "asleep" (only inBed/awake). That is a
      // real measurement of zero sleep, not missing data.
      return {
        totalHours: totalCoveredHours(asleep),
        // Null rather than four zeroes when the source records no stages, so
        // the UI can omit the breakdown instead of drawing an empty chart.
        stages: hasStageDetail ? { deepHours, coreHours, remHours, awakeHours } : null,
      };
    } catch (cause) {
      warnReadFailed('sleep', cause);
      return { totalHours: null, stages: null };
    }
  }

  /**
   * Workouts are returned as a plain list, NOT summed.
   *
   * The OS does not merge workout sessions the way it merges cumulative
   * metrics, so a run recorded by both a Watch and a running app appears twice.
   * Showing the list keeps that visible to the user instead of silently
   * inflating a total. `sourceName` is surfaced so duplicates are recognisable.
   */
  async readWorkouts(from: ISODate, to: ISODate): Promise<WorkoutSession[]> {
    await this.ensureAuthorized();
    try {
      const workouts = await queryWorkoutSamples({
        filter: { date: { startDate: dayBounds(from).startDate, endDate: dayBounds(to).endDate } },
        limit: 0,
        ascending: false,
      });

      return workouts.map((workout, index) => ({
        id: workout.uuid ?? `workout-${index}`,
        activityType: activityName(WorkoutActivityType[workout.workoutActivityType]),
        startedAt: workout.startDate,
        durationMinutes: Math.round((workout.duration?.quantity ?? 0) / 60),
        energyKcal:
          workout.totalEnergyBurned?.quantity != null
            ? Math.round(workout.totalEnergyBurned.quantity)
            : null,
        sourceName: sourceNameOf(workout),
      }));
    } catch (cause) {
      warnReadFailed('workouts', cause);
      return [];
    }
  }
}

/**
 * A failed read and an empty day both surface as "no data" in the UI, which is
 * correct for the user but useless for diagnosis. Logging the cause is what
 * distinguishes "HealthKit threw" from "you genuinely have no data yet".
 */
function warnReadFailed(metric: string, cause: unknown): void {
  console.warn(
    `[health] ${metric} read failed:`,
    cause instanceof Error ? cause.message : String(cause),
  );
}

/** `traditionalStrengthTraining` -> `Traditional Strength Training`. */
/**
 * Which app or device recorded the session.
 *
 * Read defensively and per-workout: `source` is a native proxy object, and a
 * throw reaching the caller would lose the whole day's list over one unreadable
 * row. An unnamed source is worth far less than a named one but still more than
 * no row at all.
 */
function sourceNameOf(workout: { sourceRevision?: { source?: { name?: string } } }): string {
  try {
    const name = workout.sourceRevision?.source?.name;
    return name != null && name.trim() !== '' ? name : 'Unknown source';
  } catch {
    return 'Unknown source';
  }
}
