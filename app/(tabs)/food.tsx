import { ComingSoon } from '../../src/components/ComingSoon';
import { Screen } from '../../src/components/Screen';

/** Screen 2 -- Food logging. */
export default function FoodScreen() {
  return (
    <Screen>
      <ComingSoon
        title="Food"
        summary="Search, your usual meals, and the recipe library. This is the screen the whole app lives or dies by, so it gets built properly rather than quickly."
        todo={[
          'SQLite schema for foods, recipes and ingredients',
          'Seed the Indian food database with real per-100g values',
          'Search with calorie and macro filters (rule-based, not AI)',
          '"Your usual meals" one-tap re-logging',
          'Add-a-recipe flow with exact ingredient amounts',
        ]}
      />
    </Screen>
  );
}
