import { render } from '@testing-library/react-native';
import React from 'react';
import { Text, useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from '../tokens';
import { useTheme } from '../useTheme';

/**
 * The theme resolves from two inputs -- the phone's appearance and the user's
 * preference -- and 'auto' meaning "defer to the phone" is the part that is
 * easy to get subtly wrong.
 */

jest.mock('react-native/Libraries/Utilities/useColorScheme');

let mockThemeMode: string | undefined = 'auto';

jest.mock('../../stores/profile', () => ({
  useProfile: (selector: (s: unknown) => unknown) =>
    selector({ profile: { themeMode: mockThemeMode } }),
}));

const setSystemScheme = (scheme: 'light' | 'dark' | null) => {
  (useColorScheme as unknown as jest.Mock).mockReturnValue(scheme);
};

/** Renders the resolved theme's identity so a test can assert on it. */
function Probe() {
  const theme = useTheme();
  return <Text>{theme.isDark ? 'dark' : 'light'}</Text>;
}

beforeEach(() => {
  mockThemeMode = 'auto';
  setSystemScheme('light');
});

describe('useTheme', () => {
  it('follows the phone when set to auto', async () => {
    setSystemScheme('dark');
    const { getByText } = await render(<Probe />);
    expect(getByText('dark')).toBeTruthy();
  });

  it('follows the phone into light too', async () => {
    setSystemScheme('light');
    const { getByText } = await render(<Probe />);
    expect(getByText('light')).toBeTruthy();
  });

  // An explicit choice is a deliberate override, so it must win.
  it('honours an explicit dark preference on a light phone', async () => {
    mockThemeMode = 'dark';
    setSystemScheme('light');
    const { getByText } = await render(<Probe />);
    expect(getByText('dark')).toBeTruthy();
  });

  it('honours an explicit light preference on a dark phone', async () => {
    mockThemeMode = 'light';
    setSystemScheme('dark');
    const { getByText } = await render(<Probe />);
    expect(getByText('light')).toBeTruthy();
  });

  // useColorScheme returns null when the platform expresses no preference.
  it('treats an absent system preference as light', async () => {
    setSystemScheme(null);
    const { getByText } = await render(<Probe />);
    expect(getByText('light')).toBeTruthy();
  });

  it('defaults to auto when no preference has been saved', async () => {
    mockThemeMode = undefined;
    setSystemScheme('dark');
    const { getByText } = await render(<Probe />);
    expect(getByText('dark')).toBeTruthy();
  });
});

describe('palettes', () => {
  it('define the same keys, so no colour is missing in one theme', () => {
    expect(Object.keys(darkTheme.colors).sort()).toEqual(Object.keys(lightTheme.colors).sort());
    expect(Object.keys(darkTheme.metricColors).sort()).toEqual(
      Object.keys(lightTheme.metricColors).sort(),
    );
    expect(Object.keys(darkTheme.metricTints).sort()).toEqual(
      Object.keys(lightTheme.metricTints).sort(),
    );
  });

  it('actually differ, rather than dark being a copy of light', () => {
    expect(darkTheme.colors.background).not.toBe(lightTheme.colors.background);
    expect(darkTheme.colors.text).not.toBe(lightTheme.colors.text);
    // Metric hues are re-chosen for dark, not reused.
    expect(darkTheme.metricColors.steps).not.toBe(lightTheme.metricColors.steps);
  });

  it('inverts text against background in each theme', () => {
    // A rough luminance check: dark text on light, light text on dark.
    const luminance = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3;
    };
    expect(luminance(lightTheme.colors.text)).toBeLessThan(luminance(lightTheme.colors.background));
    expect(luminance(darkTheme.colors.text)).toBeGreaterThan(
      luminance(darkTheme.colors.background),
    );
  });
});
