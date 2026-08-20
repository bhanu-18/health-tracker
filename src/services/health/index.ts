import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { MockHealthProvider } from './mock';
import type { HealthProvider } from './types';

export * from './types';

/**
 * Native health modules are compiled into the binary. Expo Go ships a fixed
 * binary that does not contain them, so importing one there throws at require
 * time rather than failing gracefully when called.
 *
 * Hence the mock in Expo Go, and the lazy require below for real builds: a
 * static import of the HealthKit module would be evaluated even on Android,
 * where it does not exist.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let cached: HealthProvider | null = null;

export function getHealthProvider(): HealthProvider {
  if (cached) return cached;
  cached = createProvider();
  return cached;
}

function createProvider(): HealthProvider {
  if (isExpoGo) return new MockHealthProvider();

  if (Platform.OS === 'ios') {
    try {
      // Required lazily so this module stays importable on Android and in tests.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { HealthKitProvider } = require('./healthkit') as typeof import('./healthkit');
      return new HealthKitProvider();
    } catch {
      // A dev build without the native module rebuilt yet. Falling back keeps
      // the app usable instead of crashing on launch.
      return new MockHealthProvider();
    }
  }

  // TODO: HealthConnectProvider for Android, via react-native-health-connect.
  return new MockHealthProvider();
}

/** Whether the app is currently serving fabricated data, for a UI notice. */
export function isUsingMockHealthData(): boolean {
  return getHealthProvider() instanceof MockHealthProvider;
}
