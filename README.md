# Health & Wellness Tracker

Food, steps, sleep and weight in one daily view. Built for personal and family
use first, with an accurate Indian recipe database as the core differentiator.

## Status

Foundation complete. The Today dashboard renders against sample health data;
food, weight and history are stubs with their remaining work listed on-screen.

| Area                                                  | State                               |
| ----------------------------------------------------- | ----------------------------------- |
| Project setup, TypeScript strict, lint/format/test/CI | Done                                |
| Design tokens and UI primitives                       | Done                                |
| Nutrition and weight-trend logic (28 tests)           | Done                                |
| Health provider interface + mock                      | Done                                |
| Today dashboard                                       | Renders on sample data              |
| Food, Weight, History screens                         | Stubs                               |
| Real HealthKit reads                                  | Not started -- needs a dev build    |
| SQLite persistence                                    | Not started                         |
| Supabase sync                                         | Deferred until the local loop works |

## Requirements

- Node 22 (`.nvmrc` pins it -- run `nvm use`)
- An iPhone, for anything involving real health data

## Running it

```bash
nvm use
npm install
npm start        # then press `i`, or scan the QR code with Expo Go
```

### Why the dashboard shows sample data

HealthKit does not exist in the iOS Simulator, and native health modules are not
present in Expo Go's prebuilt binary. Until a development build exists, the app
falls back to `MockHealthProvider`. Nothing in the UI changes when the real
provider lands -- see `src/services/health/index.ts`.

## Commands

| Command             | What it does                       |
| ------------------- | ---------------------------------- |
| `npm start`         | Expo dev server                    |
| `npm test`          | Jest                               |
| `npm run lint`      | ESLint                             |
| `npm run typecheck` | `tsc --noEmit`                     |
| `npm run verify`    | All three, exactly as CI runs them |

## Layout

```
app/                      expo-router routes; the file tree IS the navigation
  (tabs)/                 the four V1 screens
  settings.tsx
src/
  components/             shared UI primitives
  hooks/
  lib/                    pure logic -- no React, no native imports, heavily tested
  services/health/        platform-agnostic health-data layer
  stores/                 zustand state
  theme/tokens.ts         every colour, space and type value in the app
```

## Two rules worth knowing

**Never sum raw health samples.** A user with a Watch and a Fitbit has the same
steps recorded more than once. Always use the platform aggregate query
(`HKStatisticsQuery`, Health Connect's aggregate read), which reconciles sources.
Workout _sessions_ are the exception and are shown as an un-merged list, so any
duplicate stays visible rather than silently inflating a total. Full explanation
in `src/services/health/types.ts`.

**`null` is not `0`.** A missing metric means "we don't know" -- permission
denied, watch not synced. Zero means "you genuinely did nothing". Rendering the
first as the second makes the app lie, so the types keep them distinct.

## `npm audit` is noisy here

The high-severity findings all trace to one issue (`image-size`, an ICNS parser
DoS) inside Metro, the bundler. Metro runs on your machine over your own source
and is not part of the shipped app. **Do not run `npm audit fix --force`** -- it
downgrades Expo and breaks the build.
