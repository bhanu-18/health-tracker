import { ComingSoon } from '../../src/components/ComingSoon';
import { Screen } from '../../src/components/Screen';

/** Screen 4 -- History and trends. */
export default function HistoryScreen() {
  return (
    <Screen>
      <ComingSoon
        title="History"
        summary="Weekly and monthly charts, plus your workout sessions."
        todo={[
          'Weekly and monthly charts for steps, sleep, weight and calories',
          'Workout session list (shown un-merged, so duplicates stay visible)',
          'Range reads via the platform aggregate query, never raw samples',
        ]}
      />
    </Screen>
  );
}
