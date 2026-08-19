import { ComingSoon } from '../../src/components/ComingSoon';
import { Screen } from '../../src/components/Screen';

/** Screen 3 -- Weight logging. */
export default function WeightScreen() {
  return (
    <Screen>
      <ComingSoon
        title="Weight"
        summary="Quick manual entry and a trend line. The trend maths is already written and tested -- this screen just needs the entry form and the chart."
        todo={[
          'Quick-entry number pad, defaulting to your last reading',
          'Persist entries to SQLite',
          'Trend line chart (react-native-svg)',
          'Wire the 7-day trend delta into the Today dashboard',
        ]}
      />
    </Screen>
  );
}
