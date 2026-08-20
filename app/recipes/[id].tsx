import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AddIngredientSheet, type NewIngredient } from '../../src/components/AddIngredientSheet';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { SwipeToDelete } from '../../src/components/SwipeToDelete';
import { Body, Caption, Display, Heading, Title } from '../../src/components/Typography';
import {
  addIngredient,
  getRecipe,
  removeIngredient,
  type RecipeWithIngredients,
} from '../../src/db/repositories/recipes';
import { today } from '../../src/lib/dates';
import { formatAmount, type IngredientUnit } from '../../src/lib/recipes';
import { useFoodLog } from '../../src/stores/foodLog';
import { colors, metricColors, metricTints, radius, spacing } from '../../src/theme/tokens';

/** Meal slot suggested from the clock, matching the food screen. */
function slotForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return 'breakfast' as const;
  if (hour < 16) return 'lunch' as const;
  if (hour < 21) return 'dinner' as const;
  return 'snack' as const;
}

/**
 * Recipe detail: the ingredient table and what one serving works out to.
 *
 * The ingredient list is the product feature. A generic database says "chana
 * masala, about 300 kcal"; this says 400 g chickpeas, one onion, 150 ml puree,
 * four tablespoons of oil, and 310 kcal a serving because that is what you
 * actually cooked.
 */
export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const logMeal = useFoodLog((s) => s.logMeal);

  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const loaded = await getRecipe(id);
    setRecipe(loaded ?? null);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleAdd = async (ingredient: NewIngredient) => {
    if (!id) return;
    await addIngredient(id, {
      foodId: ingredient.foodId,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      calories: ingredient.calories,
      proteinG: ingredient.proteinG,
      carbsG: ingredient.carbsG,
      fatG: ingredient.fatG,
    });
    setSheetOpen(false);
    await load();
  };

  /**
   * No confirmation dialog.
   *
   * The swipe already takes deliberate effort and can be abandoned mid-way, and
   * removing an ingredient is trivially undone by adding it again -- a
   * confirm step on a reversible action is friction that trains people to
   * dismiss dialogs without reading them.
   */
  const handleRemove = async (ingredientId: string) => {
    await removeIngredient(ingredientId);
    await load();
  };

  const logOneServing = async () => {
    if (!recipe) return;
    await logMeal({
      date: today(),
      slot: slotForNow(),
      name: recipe.name,
      servings: 1,
      calories: Math.round(recipe.caloriesPerServing),
      proteinG: recipe.proteinPerServingG,
      carbsG: recipe.carbsPerServingG,
      fatG: recipe.fatPerServingG,
      recipeId: recipe.id,
    });
    router.push('/');
  };

  if (!recipe) {
    return (
      <Screen>
        <Body color={colors.textMuted}>Loading...</Body>
      </Screen>
    );
  }

  const hasIngredients = recipe.ingredients.length > 0;

  return (
    <Screen>
      <Heading>{recipe.name}</Heading>
      <Caption style={styles.serves} color={colors.textMuted}>
        {`Serves ${recipe.serves}`}
      </Caption>

      <View style={styles.hero}>
        <Display style={styles.heroNumber} color={metricColors.food}>
          {Math.round(recipe.caloriesPerServing)}
        </Display>
        <Title style={styles.heroLabel} color={colors.textMuted}>
          kcal per serving
        </Title>
        <Caption style={styles.heroMacros} color={colors.textFaint}>
          {`P ${recipe.proteinPerServingG}g · C ${recipe.carbsPerServingG}g · F ${recipe.fatPerServingG}g`}
        </Caption>
      </View>

      <Title style={styles.sectionTitle}>Ingredients</Title>

      {!hasIngredients ? (
        <Body style={styles.empty} color={colors.textMuted}>
          No ingredients yet. Add what goes in the pot and the per-serving nutrition is calculated
          from it.
        </Body>
      ) : (
        recipe.ingredients.map((ingredient) => (
          <SwipeToDelete
            key={ingredient.id}
            label={`${ingredient.name}, ${Math.round(ingredient.calories)} kcal`}
            onDelete={() => void handleRemove(ingredient.id)}
          >
            <View style={styles.ingredientRow}>
              <View style={styles.ingredientInfo}>
                <Body>{ingredient.name}</Body>
                <Caption style={styles.amount} color={colors.textFaint}>
                  {formatAmount({
                    quantity: ingredient.quantity,
                    unit: ingredient.unit as IngredientUnit,
                  })}
                </Caption>
              </View>
              <Body color={colors.textMuted}>{`${Math.round(ingredient.calories)} kcal`}</Body>
            </View>
          </SwipeToDelete>
        ))
      )}

      <View style={styles.addRow}>
        <Button label="Add ingredient" variant="secondary" onPress={() => setSheetOpen(true)} />
      </View>

      {hasIngredients ? (
        <View style={styles.logRow}>
          <Button label="Log one serving" onPress={() => void logOneServing()} />
        </View>
      ) : null}

      <Body style={styles.hint} color={colors.textFaint}>
        Swipe an ingredient left to remove it. Totals recalculate automatically.
      </Body>

      <AddIngredientSheet
        visible={sheetOpen}
        onCancel={() => setSheetOpen(false)}
        onAdd={(ingredient) => void handleAdd(ingredient)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  serves: { marginTop: spacing.xs },
  hero: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: metricTints.food,
  },
  heroNumber: { fontSize: 52, lineHeight: 56 },
  heroLabel: { fontWeight: '500', marginTop: spacing.xs },
  heroMacros: { textTransform: 'none', letterSpacing: 0, fontWeight: '400', marginTop: spacing.sm },
  sectionTitle: { fontSize: 18, marginBottom: spacing.md },
  empty: { marginBottom: spacing.lg },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  ingredientInfo: { gap: 2, flex: 1 },
  amount: { textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  addRow: { marginTop: spacing.md },
  logRow: { marginTop: spacing.md },
  hint: { marginTop: spacing.lg, fontSize: 13 },
});
