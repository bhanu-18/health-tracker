import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { FormField } from '../../src/components/FormField';
import { Screen } from '../../src/components/Screen';
import { Body, Heading } from '../../src/components/Typography';
import { createRecipe } from '../../src/db/repositories/recipes';
import { colors, spacing } from '../../src/theme/tokens';

/**
 * Create a recipe: name and serving count only.
 *
 * Ingredients are added on the detail screen afterwards rather than here, so
 * the recipe exists before the fiddly part begins -- entering eight
 * ingredients and losing them to a mistyped serving count would be miserable.
 */
export default function NewRecipeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [serves, setServes] = useState('4');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Give the recipe a name.');
      return;
    }

    const servesValue = Number.parseInt(serves, 10);
    if (!Number.isFinite(servesValue) || servesValue < 1) {
      setError('A recipe must serve at least one person.');
      return;
    }

    setError(null);
    const recipe = await createRecipe({ name: trimmed, serves: servesValue });
    // Replace rather than push, so Back from the detail screen returns to the
    // library instead of to an empty create form.
    router.replace(`/recipes/${recipe.id}`);
  };

  return (
    <Screen>
      <Heading>New recipe</Heading>

      <View style={styles.form}>
        <FormField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Chana masala"
          autoFocus
        />
        <FormField
          label="Serves"
          value={serves}
          onChangeText={setServes}
          keyboardType="number-pad"
          suffix="people"
        />
      </View>

      {error ? (
        <Body style={styles.error} color={colors.danger}>
          {error}
        </Body>
      ) : null}

      <Button label="Create" onPress={() => void save()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.xl },
  error: { marginBottom: spacing.md, fontSize: 14 },
});
