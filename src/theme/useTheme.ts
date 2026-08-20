import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useProfile } from '../stores/profile';
import { darkTheme, lightTheme, type Theme, type ThemeMode } from './tokens';

/**
 * The active theme.
 *
 * Two inputs: the phone's appearance setting and the user's preference. 'auto'
 * defers to the phone, which is the right default -- the system setting is
 * usually deliberate and often on a schedule -- while an explicit choice wins,
 * because "follow the system" is not what everyone wants.
 */
export function useThemeMode(): ThemeMode {
  return useProfile((state) => (state.profile?.themeMode as ThemeMode) ?? 'auto');
}

export function useTheme(): Theme {
  const mode = useThemeMode();
  // Null when the system offers no preference; treated as light.
  const systemScheme = useColorScheme();

  const isDark = mode === 'auto' ? systemScheme === 'dark' : mode === 'dark';
  return isDark ? darkTheme : lightTheme;
}

/**
 * Build a stylesheet from the active theme.
 *
 * StyleSheet.create runs at module load, so a stylesheet that references
 * colours is fixed at import time and cannot follow a theme change. Passing a
 * factory instead defers that until render, and memoising on the theme means it
 * is rebuilt only when the theme actually changes -- not on every render.
 *
 * Define the factory at module scope so its identity is stable; a factory
 * declared inside the component would defeat the memo.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
