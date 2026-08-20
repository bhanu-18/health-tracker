import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { LogMealSheet, type LogMealTarget } from '../../src/components/LogMealSheet';
import { Screen } from '../../src/components/Screen';
import { SearchField } from '../../src/components/SearchField';
import { Body, Caption, Heading, Title } from '../../src/components/Typography';
import { findFoodCandidates, getAllFoods } from '../../src/db/repositories/foods';
import {
  addUsualMeal,
  getUsualMeals,
  recordUsualMealUse,
  type UsualMealWithFood,
} from '../../src/db/repositories/usualMeals';
import type { Food, MealSlot } from '../../src/db/schema';
import { today } from '../../src/lib/dates';
import { searchFoods, type SearchFilters, type SortOrder } from '../../src/lib/foodSearch';
import { scaleNutrition } from '../../src/lib/nutrition';
import { useFoodLog } from '../../src/stores/foodLog';
import { radius, spacing } from '../../src/theme/tokens';
import type { Theme } from '../../src/theme/tokens';
import { useTheme, useThemedStyles } from '../../src/theme/useTheme';

/** Meal slot suggested from the clock, so the common case needs no thought. */
function slotForNow(date = new Date()): MealSlot {
  const hour = date.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

/**
 * Sort orders.
 *
 * Deliberately absent: sorting a whole library by calories. While logging you
 * are looking for a specific food, and relevance already handles that -- a
 * calorie leaderboard is mostly a list of nuts and oils, which is not a
 * question anyone has while cooking.
 *
 * Sorting is instead what makes a *filter* actionable: "High protein" ordered
 * by protein density tells you what to eat, where alphabetical does not.
 */
const SORTS: { label: string; value: SortOrder }[] = [
  { label: 'A-Z', value: 'relevance' },
  { label: 'Lowest calories', value: 'calories' },
  { label: 'Most protein per kcal', value: 'proteinDensity' },
];

/** Calorie bands for the rule-based filter. Not AI, per the V1 scope. */
const CALORIE_FILTERS: { label: string; filters: SearchFilters }[] = [
  { label: 'All', filters: {} },
  { label: 'Under 150', filters: { calories: { max: 150 } } },
  { label: 'Under 300', filters: { calories: { max: 300 } } },
  { label: 'High protein', filters: { proteinG: { min: 10 } } },
];

/**
 * Screen 2 -- Food logging.
 *
 * Ordered by how often each path is used: your usual meals sit above search,
 * because the whole premise is a repeating rotation of home-cooked dishes. Most
 * logging should be one tap and never reach the search field at all.
 */
export default function FoodScreen() {
  const { colors, metricColors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filterIndex, setFilterIndex] = useState(0);
  const [sortIndex, setSortIndex] = useState(0);
  const [candidates, setCandidates] = useState<Food[]>([]);
  const [usuals, setUsuals] = useState<UsualMealWithFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [target, setTarget] = useState<LogMealTarget | null>(null);

  const logMeal = useFoodLog((s) => s.logMeal);
  const date = today();

  const loadUsuals = useCallback(async () => {
    setUsuals(await getUsualMeals());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [foods] = await Promise.all([getAllFoods(), loadUsuals()]);
        if (cancelled) return;
        setCandidates(foods);
      } catch (cause) {
        // Without this the screen showed a spinner forever on a failed read:
        // the rejection escaped, setIsLoading(false) never ran, and there was
        // no path back. An empty library is recoverable; a permanent spinner
        // with no explanation is not.
        console.warn('[food] could not load the library:', cause);
      } finally {
        // In `finally`, so the spinner always clears -- success or failure.
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadUsuals]);

  // Narrow in SQL when the query is long enough to be selective; below that the
  // full library is already in memory and filtering it is cheaper than a query.
  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    (async () => {
      const rows = await findFoodCandidates(query);
      if (!cancelled) setCandidates(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Depend on the index, not on a filters object: the `?? {}` fallback builds a
  // new object every render, so a dependency on it would defeat the memo
  // entirely -- the same unstable-reference trap that caused the render loop on
  // the Today screen.
  const results = useMemo(() => {
    const filters = CALORIE_FILTERS[filterIndex]?.filters ?? {};
    const sort = SORTS[sortIndex]?.value ?? 'relevance';
    return searchFoods(
      candidates.map((food) => ({
        id: food.id,
        name: food.name,
        nameNormalized: food.nameNormalized,
        calories: food.calories,
        proteinG: food.proteinG,
        carbsG: food.carbsG,
        fatG: food.fatG,
        food,
      })),
      query,
      filters,
      sort,
    ).map((row) => row.food);
    // sortIndex belongs in the dependency list as much as the argument list:
    // without it the memo would keep returning the previous order even once the
    // argument was passed.
  }, [candidates, query, filterIndex, sortIndex]);

  const openFood = (food: Food) => {
    setTarget({
      name: food.name,
      servingLabel: food.servingLabel,
      perServing: {
        calories: food.calories,
        protein: food.proteinG,
        carbs: food.carbsG,
        fat: food.fatG,
      },
      foodId: food.id,
    });
  };

  /** One tap: log a usual at its saved portion, without opening the sheet. */
  const logUsualDirectly = async (usual: UsualMealWithFood) => {
    const totals = scaleNutrition(
      {
        calories: usual.calories,
        protein: usual.proteinG,
        carbs: usual.carbsG,
        fat: usual.fatG,
      },
      usual.servings,
    );

    await logMeal({
      date,
      slot: usual.slot ?? slotForNow(),
      name: usual.displayName,
      servings: usual.servings,
      calories: totals.calories,
      proteinG: totals.protein,
      carbsG: totals.carbs,
      fatG: totals.fat,
      foodId: usual.foodId,
      recipeId: usual.recipeId,
    });

    await recordUsualMealUse(usual.id);
    await loadUsuals();
    router.push('/');
  };

  const confirmLog = async ({
    slot,
    servings,
    totals,
  }: {
    slot: MealSlot;
    servings: number;
    totals: { calories: number; protein: number; carbs: number; fat: number };
  }) => {
    if (!target) return;

    await logMeal({
      date,
      slot,
      name: target.name,
      servings,
      calories: totals.calories,
      proteinG: totals.protein,
      carbsG: totals.carbs,
      fatG: totals.fat,
      foodId: target.foodId ?? null,
      recipeId: target.recipeId ?? null,
    });

    setTarget(null);
    router.push('/');
  };

  const saveAsUsual = async (food: Food) => {
    await addUsualMeal({ foodId: food.id, servings: 1 });
    await loadUsuals();
  };

  return (
    <Screen>
      <Heading>Log food</Heading>

      <View style={styles.searchWrap}>
        <SearchField value={query} onChangeText={setQuery} />
      </View>

      <View style={styles.recipesLink}>
        <Button
          label="Recipe library"
          variant="secondary"
          onPress={() => router.push('/recipes')}
        />
      </View>
      <View style={styles.newFoodLink}>
        <Button
          label="Add a new food"
          variant="secondary"
          onPress={() => router.push('/foods/new')}
        />
      </View>

      <View style={styles.filterRow}>
        {CALORIE_FILTERS.map((filter, index) => (
          <Pressable
            key={filter.label}
            onPress={() => setFilterIndex(index)}
            style={[styles.chip, filterIndex === index && styles.chipSelected]}
          >
            <Caption
              style={styles.chipText}
              color={filterIndex === index ? colors.primaryText : colors.textMuted}
            >
              {filter.label}
            </Caption>
          </Pressable>
        ))}
      </View>

      <View style={styles.filterRow}>
        {SORTS.map((option, index) => (
          <Pressable
            key={option.value}
            onPress={() => setSortIndex(index)}
            style={[styles.chip, sortIndex === index && styles.chipSelected]}
          >
            <Caption
              style={styles.chipText}
              color={sortIndex === index ? colors.primaryText : colors.textMuted}
            >
              {option.label}
            </Caption>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.text} />
      ) : (
        <>
          {query.length === 0 && usuals.length > 0 ? (
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Your usual meals</Title>
              <Caption style={styles.sectionHint} color={colors.textFaint}>
                Tap to log instantly
              </Caption>
              {usuals.map((usual) => (
                <Pressable
                  key={usual.id}
                  onPress={() => void logUsualDirectly(usual)}
                  style={styles.usualRow}
                >
                  <View style={styles.rowInfo}>
                    <Body>{usual.displayName}</Body>
                    <Caption style={styles.rowMeta} color={colors.textFaint}>
                      {usual.servings === 1 ? '1 serving' : `${usual.servings} servings`}
                    </Caption>
                  </View>
                  <Body color={metricColors.food}>
                    {Math.round(usual.calories * usual.servings)} kcal
                  </Body>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Title style={styles.sectionTitle}>{query.length > 0 ? 'Results' : 'All foods'}</Title>

            {results.length === 0 ? (
              <View style={styles.emptyState}>
                <Body color={colors.textMuted}>
                  {query.length > 0
                    ? `Nothing matches "${query}". Try a different spelling, or add it yourself.`
                    : 'No foods yet.'}
                </Body>
                <View style={styles.emptyAction}>
                  <Button label="Add a new food" onPress={() => router.push('/foods/new')} />
                </View>
              </View>
            ) : (
              results.map((food) => (
                <Pressable
                  key={food.id}
                  onPress={() => openFood(food)}
                  style={styles.foodRow}
                  // Stable handle for asserting result ORDER in tests. Matching
                  // on rendered text picked up the sort chips themselves.
                  testID={`food-row-${food.id}`}
                >
                  <View style={styles.rowInfo}>
                    <Body>{food.name}</Body>
                    <Caption style={styles.rowMeta} color={colors.textFaint}>
                      {food.servingLabel}
                    </Caption>
                  </View>

                  <View style={styles.rowRight}>
                    <Body color={colors.textMuted}>{Math.round(food.calories)} kcal</Body>
                    <Pressable
                      onPress={() => void saveAsUsual(food)}
                      hitSlop={10}
                      accessibilityLabel={`Save ${food.name} as a usual meal`}
                    >
                      <Ionicons name="bookmark-outline" size={18} color={colors.textFaint} />
                    </Pressable>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </>
      )}

      <LogMealSheet
        target={target}
        defaultSlot={slotForNow()}
        onCancel={() => setTarget(null)}
        onConfirm={(args) => void confirmLog(args)}
      />
    </Screen>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    searchWrap: { marginTop: spacing.lg },
    recipesLink: { marginTop: spacing.md },
    newFoodLink: { marginTop: spacing.sm },
    emptyState: { marginTop: spacing.md },
    emptyAction: { marginTop: spacing.lg },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
    },
    chipSelected: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    chipText: { textTransform: 'none', letterSpacing: 0 },
    loading: { marginTop: spacing.xxl },
    section: { marginTop: spacing.xl },
    sectionTitle: { fontSize: 18 },
    sectionHint: {
      textTransform: 'none',
      letterSpacing: 0,
      marginTop: 2,
      marginBottom: spacing.md,
    },
    usualRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.metricTints.food,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    foodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    rowInfo: { gap: 2, flex: 1 },
    rowMeta: { textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    empty: { marginTop: spacing.md },
  });
