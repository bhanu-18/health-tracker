import { addDays, dateRange } from '../../lib/dates';
import type {
  DailyHealthMetrics,
  HealthProvider,
  ISODate,
  PermissionStatus,
  WorkoutSession,
} from './types';

/**
 * A stand-in health provider with plausible fake data.
 *
 * Why this exists: HealthKit does not run in the iOS Simulator, and native
 * health modules do not run in Expo Go at all. Without this, no part of the
 * dashboard could be built or demoed until a full native dev build existed.
 *
 * It is also what lets the UI be tested deterministically -- the real providers
 * return whatever the user's watch happened to record.
 */

/**
 * Deterministic pseudo-random in 0..1, seeded from the date string.
 * Deliberately not Math.random(): re-rendering a screen must not change
 * yesterday's step count.
 */
function seededUnit(date: ISODate, salt: number): number {
  let hash = salt;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) % 100_000;
  }
  return hash / 100_000;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

function metricsFor(date: ISODate): DailyHealthMetrics {
  const total = round1(5.5 + seededUnit(date, 29) * 3.5);

  return {
    date,
    steps: Math.round(4_000 + seededUnit(date, 7) * 9_000),
    activeEnergyKcal: Math.round(180 + seededUnit(date, 13) * 520),
    sleepHours: total,
    // Roughly the proportions a healthy night actually has: mostly core, with
    // deep and REM each a fifth or so.
    sleepStages: {
      deepHours: round1(total * 0.18),
      coreHours: round1(total * 0.55),
      remHours: round1(total * 0.22),
      awakeHours: round1(total * 0.05),
    },
    restingHeartRate: Math.round(54 + seededUnit(date, 41) * 12),
    // A plausible recent write, so the freshness indicator is exercised.
    lastRecordedAt: new Date(`${date}T09:30:00`),
  };
}

export class MockHealthProvider implements HealthProvider {
  readonly name = 'Mock health data';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async requestPermissions(): Promise<PermissionStatus> {
    return 'granted';
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    return 'granted';
  }

  async readDailyMetrics(date: ISODate): Promise<DailyHealthMetrics> {
    return metricsFor(date);
  }

  async readDailyMetricsRange(from: ISODate, to: ISODate): Promise<DailyHealthMetrics[]> {
    return dateRange(from, to).map(metricsFor);
  }

  async readWorkouts(from: ISODate, to: ISODate): Promise<WorkoutSession[]> {
    const day = addDays(to, -1);
    return [
      {
        id: `mock-workout-${day}`,
        activityType: 'Running',
        startedAt: new Date(`${day}T07:15:00`),
        durationMinutes: 32,
        energyKcal: 288,
        sourceName: 'Apple Watch',
      },
      {
        id: `mock-workout-${from}`,
        activityType: 'Strength Training',
        startedAt: new Date(`${from}T18:40:00`),
        durationMinutes: 45,
        energyKcal: 210,
        sourceName: 'iPhone',
      },
    ];
  }
}
