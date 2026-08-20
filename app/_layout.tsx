import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Body, Heading } from '../src/components/Typography';
import { useMigrations } from '../src/db/migrate';
import { seedFoodDatabase } from '../src/db/seed/run';
import { useProfile } from '../src/stores/profile';
import { colors, spacing } from '../src/theme/tokens';

/**
 * Root layout. Wraps the app in the providers that must sit above every screen,
 * and gates rendering on the database being ready.
 *
 * Nothing may render before migrations finish: a screen that queries a table
 * which does not exist yet crashes, and that race is intermittent, so it would
 * pass in testing and fail on a cold install.
 */
export default function RootLayout() {
  const { success, error } = useMigrations();
  const [seeded, setSeeded] = useState(false);
  const loadProfile = useProfile((s) => s.load);

  useEffect(() => {
    if (!success) return;
    let cancelled = false;

    // Seed and profile load together: both are prerequisites for the first
    // screen, and running them in parallel keeps the startup spinner short.
    Promise.all([seedFoodDatabase(), loadProfile()])
      .catch((cause) => {
        // Not fatal -- the app works with an empty food library and the
        // profile defaults, and the user can still add their own foods.
        console.warn('[db] startup load failed:', cause);
      })
      .finally(() => {
        if (!cancelled) setSeeded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [success, loadProfile]);

  if (error) {
    return (
      <SafeAreaProvider>
        <View style={styles.center}>
          <Heading>Database error</Heading>
          <Body style={styles.errorText} color={colors.textMuted}>
            {error.message}
          </Body>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!success || !seeded) {
    return (
      <SafeAreaProvider>
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          {/* Settings is pushed over the tabs rather than being a tab of its own. */}
          <Stack.Screen
            name="settings"
            options={{ headerShown: true, title: 'Settings', presentation: 'modal' }}
          />
          {/* Recipes are pushed over the tabs rather than being a tab of their
              own: they are reached from food logging, and a fifth tab would
              crowd the bar for something used weekly rather than daily. */}
          <Stack.Screen name="recipes/index" options={{ headerShown: true, title: 'Recipes' }} />
          <Stack.Screen name="recipes/new" options={{ headerShown: true, title: 'New recipe' }} />
          <Stack.Screen name="recipes/[id]" options={{ headerShown: true, title: 'Recipe' }} />
          <Stack.Screen name="foods/new" options={{ headerShown: true, title: 'New food' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    textAlign: 'center',
  },
});
