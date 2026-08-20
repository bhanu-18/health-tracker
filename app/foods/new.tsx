import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { FormField } from '../../src/components/FormField';
import { Screen } from '../../src/components/Screen';
import { Body, Caption, Heading } from '../../src/components/Typography';
import { createFood } from '../../src/db/repositories/foods';
import { caloriesFromMacros, macrosLookInconsistent } from '../../src/lib/nutrition';
import { radius, spacing } from '../../src/theme/tokens';
import type { Theme } from '../../src/theme/tokens';
import { useTheme, useThemedStyles } from '../../src/theme/useTheme';

/** Millilitres in one cup, matching the conversion table in lib/recipes.ts. */
const ML_PER_CUP = 240;

const parse = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Add a food the database does not have.
 *
 * Without this the app only worked for the foods that shipped with it: a
 * packaged snack, a restaurant dish or someone's particular sambar could not be
 * logged at all, with no workaround.
 *
 * The form asks for a serving weight rather than treating it as optional,
 * because recipe scaling divides by it. A food without one cannot be measured
 * by weight, and the user would have no way to know why the gram option had
 * quietly disappeared.
 */
export default function NewFoodScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const [name, setName] = useState('');
  const [servingLabel, setServingLabel] = useState('');
  const [servingGrams, setServingGrams] = useState('');
  const [isCountable, setIsCountable] = useState(false);
  const [gramsPerCup, setGramsPerCup] = useState('');

  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const facts = useMemo(
    () => ({
      calories: parse(calories),
      protein: parse(protein),
      carbs: parse(carbs),
      fat: parse(fat),
    }),
    [calories, protein, carbs, fat],
  );

  /**
   * A warning, not a block.
   *
   * Stated calories and stated macros disagreeing usually means a typo, but
   * whole foods legitimately drift -- fibre counts as carbohydrate and is not
   * fully metabolised. Refusing to save would reject correct data; saying
   * nothing would let a misplaced decimal into months of history.
   */
  const macrosLookOff = useMemo(() => macrosLookInconsistent(facts), [facts]);

  const save = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError('Give the food a name.');
      return;
    }
    if (facts.calories <= 0) {
      setError('Enter the calories for one serving.');
      return;
    }

    const grams = parse(servingGrams);
    if (grams <= 0 && !isCountable) {
      setError(
        'Enter the serving weight in grams, or mark it as a countable item. Without either, this food cannot be measured at all.',
      );
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const cupWeight = parse(gramsPerCup);
      await createFood({
        name: trimmedName,
        servingLabel: servingLabel.trim() || (grams > 0 ? `${grams} g` : '1 serving'),
        servingGrams: grams > 0 ? grams : null,
        isCountable,
        // "What does a cup weigh" is a question people can answer; density is
        // not. Derived here so volume units behave exactly as for seeded foods.
        densityGPerMl: cupWeight > 0 ? cupWeight / ML_PER_CUP : null,
        calories: facts.calories,
        proteinG: facts.protein,
        carbsG: facts.carbs,
        fatG: facts.fat,
      });
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the food.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <Heading>New food</Heading>
      <Body style={styles.intro} color={colors.textMuted}>
        Enter the nutrition for one serving, as printed on the packet or as you measure it.
      </Body>

      <View style={styles.form}>
        <FormField label="Name" value={name} onChangeText={setName} placeholder="Greek yogurt" />
        <FormField
          label="Serving"
          value={servingLabel}
          onChangeText={setServingLabel}
          placeholder="100 g, or 1 medium"
        />
        <FormField
          label="Serving weight"
          value={servingGrams}
          onChangeText={setServingGrams}
          keyboardType="decimal-pad"
          suffix="g"
        />

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Caption>Countable item</Caption>
            <Body style={styles.toggleHint} color={colors.textFaint}>
              One serving is a discrete thing you can count, like an egg or a roti.
            </Body>
          </View>
          <Switch
            value={isCountable}
            onValueChange={setIsCountable}
            accessibilityLabel="Countable item"
          />
        </View>

        <FormField
          label="Weight of 1 cup (optional)"
          value={gramsPerCup}
          onChangeText={setGramsPerCup}
          keyboardType="decimal-pad"
          suffix="g"
        />
        <Body style={styles.fieldHint} color={colors.textFaint}>
          Only needed to measure this in cups or spoons. Leave it blank and the food can still be
          measured by weight.
        </Body>

        <FormField
          label="Calories"
          value={calories}
          onChangeText={setCalories}
          keyboardType="decimal-pad"
          suffix="kcal"
        />
        <FormField
          label="Protein"
          value={protein}
          onChangeText={setProtein}
          keyboardType="decimal-pad"
          suffix="g"
        />
        <FormField
          label="Carbs"
          value={carbs}
          onChangeText={setCarbs}
          keyboardType="decimal-pad"
          suffix="g"
        />
        <FormField
          label="Fat"
          value={fat}
          onChangeText={setFat}
          keyboardType="decimal-pad"
          suffix="g"
        />
      </View>

      {macrosLookOff ? (
        <View style={styles.warning}>
          <Body style={styles.warningText}>
            {`These macros work out to about ${caloriesFromMacros(facts)} kcal, not ${Math.round(facts.calories)}. Worth a check, though whole foods do drift a little.`}
          </Body>
        </View>
      ) : null}

      {error ? (
        <Body style={styles.error} color={colors.danger}>
          {error}
        </Body>
      ) : null}

      <Button label={isSaving ? 'Saving...' : 'Save food'} onPress={() => void save()} />
    </Screen>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    intro: { marginTop: spacing.sm, marginBottom: spacing.lg },
    form: { gap: spacing.lg, marginBottom: spacing.lg },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.lg,
    },
    toggleText: { flex: 1, gap: 2 },
    toggleHint: { fontSize: 13 },
    fieldHint: { fontSize: 13, marginTop: -spacing.sm },
    warning: {
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: t.metricTints.weight,
      marginBottom: spacing.lg,
    },
    warningText: { fontSize: 14, color: t.colors.text },
    error: { marginBottom: spacing.md, fontSize: 14 },
  });
