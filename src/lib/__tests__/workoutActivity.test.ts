import { activityName } from '../workoutActivity';

describe('activityName', () => {
  it('titles a single-word activity', () => {
    expect(activityName('running')).toBe('Running');
    expect(activityName('yoga')).toBe('Yoga');
    expect(activityName('other')).toBe('Other');
  });

  it('splits camelCase into words', () => {
    expect(activityName('traditionalStrengthTraining')).toBe('Traditional Strength Training');
    expect(activityName('highIntensityIntervalTraining')).toBe('High Intensity Interval Training');
    expect(activityName('americanFootball')).toBe('American Football');
    expect(activityName('taiChi')).toBe('Tai Chi');
  });

  it('keeps connecting words lowercase inside a name', () => {
    expect(activityName('preparationAndRecovery')).toBe('Preparation and Recovery');
    expect(activityName('mindAndBody')).toBe('Mind and Body');
  });

  /**
   * The installed library can predate an activity Apple has added, and then the
   * number has no key at all. "Workout" is vague but true; the raw number was
   * neither.
   */
  it('falls back to a generic name rather than showing a number', () => {
    expect(activityName(undefined)).toBe('Workout');
    expect(activityName('')).toBe('Workout');
    expect(activityName('   ')).toBe('Workout');
  });
});
