import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Run a refresh whenever the app comes back to the foreground.
 *
 * Health data is written by other apps, so it changes while this one is not
 * running -- a band syncs, its app writes to the health store, and none of that
 * reaches a screen that read once on mount. Tab navigators keep screens mounted
 * for the life of the app, so without this the dashboard could show figures
 * from hours earlier with nothing indicating they were stale.
 *
 * Foreground is the right trigger because it is exactly when a user has been
 * elsewhere -- often in the very app that just wrote the data.
 */
export function useRefreshOnForeground(refresh: () => void): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);
}
