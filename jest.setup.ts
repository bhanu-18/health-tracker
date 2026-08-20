/**
 * Jest setup, run once before every test file.
 *
 * Native modules do not exist in the Node process Jest runs in, so anything that
 * reaches for the device has to be mocked here. Keep this file small: a mock
 * added here applies to the whole suite, which makes it easy to hide a real bug.
 */
import '@testing-library/react-native';

/**
 * KNOWN GAP: React prints "the current testing environment is not configured to
 * support act(...)" during screen tests.
 *
 * It is the environment-detection message, not "update not wrapped in act" --
 * React is saying it cannot verify act coverage, not that an update escaped
 * one. Setting IS_REACT_ACT_ENVIRONMENT from either setupFiles or
 * setupFilesAfterEnv makes no difference; it comes from how jest-expo wires the
 * React Native renderer.
 *
 * The practical cost is that leaked "state updated after the test finished"
 * bugs will not be flagged automatically, so screen tests here await the async
 * work they start rather than relying on that warning to catch it.
 */

// Reanimated ships its own Jest mock; without it, any component that animates
// throws on import rather than rendering.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports, so require() is required here.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

/**
 * Icons render as nothing in tests.
 *
 * @expo/vector-icons imports expo-font, which reaches for a native module that
 * does not exist under Node. Icons carry no behaviour worth asserting, so a
 * stub is honest rather than lossy -- anything meaningful they convey should be
 * reachable through an accessibility label instead.
 */
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

/**
 * Animated numbers render their final value immediately in tests.
 *
 * The real component counts up over ~900ms, which races waitFor's one-second
 * default: it passed on a fast laptop and failed on a slower CI runner. That
 * flake reached CI once.
 *
 * The animation is covered directly in AnimatedNumber.test.tsx, which opts out
 * of this stub and controls the clock. Everywhere else it is incidental --
 * screen tests care what the number IS, not how it arrived.
 */

jest.mock('./src/components/AnimatedNumber', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const react = require('react');
  return {
    AnimatedNumber: ({
      value,
      style,
      format,
    }: {
      value: number;
      style?: unknown;
      format?: (v: number) => string;
    }) => react.createElement(Text, { style }, format ? format(value) : String(value)),
  };
});

/**
 * A stub SQLite connection, so modules that import the database can be loaded.
 *
 * expo-sqlite is native and has no Node build, so importing src/db/client
 * throws under Jest -- which takes down any screen that transitively touches a
 * repository, even a screen the test never intended to exercise.
 *
 * This only makes the module importable. It executes no SQL, so tests that care
 * about data still mock the specific repository functions they use, which keeps
 * those mocks explicit and local rather than hidden in here.
 */
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => ({
    execSync: jest.fn(),
    runSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(() => null),
    prepareSync: jest.fn(() => ({ executeSync: jest.fn(() => ({ getAllSync: () => [] })) })),
  }),
}));
