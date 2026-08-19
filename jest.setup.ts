/**
 * Jest setup, run once before every test file.
 *
 * Native modules do not exist in the Node process Jest runs in, so anything that
 * reaches for the device has to be mocked here. Keep this file small: a mock
 * added here applies to the whole suite, which makes it easy to hide a real bug.
 */
import '@testing-library/react-native';

// Reanimated ships its own Jest mock; without it, any component that animates
// throws on import rather than rendering.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports, so require() is required here.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
