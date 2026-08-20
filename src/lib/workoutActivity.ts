/**
 * HealthKit identifies a workout by a number, not a name -- a run is 37, a walk
 * is 52. Those numbers reached the screen verbatim.
 *
 * The number-to-key mapping belongs to the OS, and the HealthKit library ships
 * it as a real enum, so the keys are looked up there rather than transcribed
 * into a table here. A hand-copied table would be wrong the moment Apple adds
 * an activity, and wrong silently -- the failure would look like a naming bug
 * years after the copy was made.
 *
 * What this module owns is only the last step: turning a camelCase key into
 * something a person reads.
 */

/**
 * Lowercase inside a name, capitalised when they lead it: HealthKit's
 * `preparationAndRecovery` is "Preparation and Recovery", not "And".
 */
const CONNECTORS = new Set(['and', 'or', 'of', 'the']);

/**
 * @param key the enum key for the activity, or undefined if the number had no
 *   key -- which happens when Apple adds an activity the installed library
 *   predates.
 */
export function activityName(key: string | undefined): string {
  if (key == null || key.trim() === '') return 'Workout';

  const words = key
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .split(/\s+/);

  const titled = words.map((word, index) => {
    const lower = word.toLowerCase();
    if (index > 0 && CONNECTORS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });

  return titled.join(' ');
}
