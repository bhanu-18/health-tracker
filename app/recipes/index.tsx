import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { Body, Caption, Heading } from '../../src/components/Typography';
import { getRecipes } from '../../src/db/repositories/recipes';
import type { Recipe } from '../../src/db/schema';
import { colors, metricColors, radius, spacing } from '../../src/theme/tokens';

/**
 * Recipe library.
 *
 * The point of this screen, and arguably of the app: a dish you cook regularly
 * is entered once with real amounts, and every portion after that is calculated
 * rather than estimated from a generic database.
 */
export default function RecipesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Reload on focus rather than on mount: returning from adding a recipe or
  // editing ingredients must show the new totals, and this screen is cheap.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getRecipes().then((rows) => {
        if (!cancelled) setRecipes(rows);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <Screen>
      <Heading>Recipes</Heading>
      <Body style={styles.intro} color={colors.textMuted}>
        Enter what actually goes in the pot once. Every serving after that is calculated, not
        guessed.
      </Body>

      {recipes.length === 0 ? (
        <View style={styles.empty}>
          <Body color={colors.textMuted}>No recipes yet.</Body>
        </View>
      ) : (
        recipes.map((recipe) => (
          <Pressable
            key={recipe.id}
            onPress={() => router.push(`/recipes/${recipe.id}`)}
            style={styles.row}
          >
            <View style={styles.rowInfo}>
              <Body>{recipe.name}</Body>
              <Caption style={styles.meta} color={colors.textFaint}>
                {`serves ${recipe.serves}`}
              </Caption>
            </View>
            <Body color={metricColors.food}>{`${Math.round(recipe.caloriesPerServing)} kcal`}</Body>
          </Pressable>
        ))
      )}

      <View style={styles.action}>
        <Button label="Add a recipe" onPress={() => router.push('/recipes/new')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: spacing.sm, marginBottom: spacing.lg },
  empty: { paddingVertical: spacing.xl },
  row: {
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
  rowInfo: { gap: 2, flex: 1 },
  meta: { textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  action: { marginTop: spacing.xl },
});
