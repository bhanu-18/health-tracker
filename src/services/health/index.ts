import Constants, { ExecutionEnvironment } from 'expo-constants';
import { MockHealthProvider } from './mock';
import type { HealthProvider } from './types';

export * from './types';

/**
 * Native health modules (react-native-health, react-native-health-connect) are
 * compiled into the binary. Expo Go ships a fixed binary that does not contain
 * them, so importing one there throws at require time rather than failing
 * gracefully at call time.
 *
 * This check is why the app runs in Expo Go today: in that environment we hand
 * back the mock. Once you build a development build, the real provider is used
 * automatically -- no code change.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let cached: HealthProvider | null = null;

export function getHealthProvider(): HealthProvider {
  if (cached) return cached;

  if (isExpoGo) {
    cached = new MockHealthProvider();
    return cached;
  }

  // TODO(next): return HealthKitProvider on iOS and HealthConnectProvider on
  // Android once the native modules are installed and a dev build exists.
  // Until then a dev build behaves exactly like Expo Go.
  cached = new MockHealthProvider();
  return cached;
}

/** Whether the app is currently serving fabricated data, for a UI notice. */
export function isUsingMockHealthData(): boolean {
  return getHealthProvider() instanceof MockHealthProvider;
}
