import { describeFreshness, isStale } from '../freshness';

const now = new Date('2026-08-20T14:00:00');
const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000);

describe('describeFreshness', () => {
  it('says nothing when there is no reading', () => {
    expect(describeFreshness(null, now)).toBeNull();
  });

  it('collapses anything under five minutes to "just now"', () => {
    // A number ticking over every minute reads as busier than it is.
    expect(describeFreshness(minutesAgo(0), now)).toBe('just now');
    expect(describeFreshness(minutesAgo(4), now)).toBe('just now');
  });

  it('counts minutes within the hour', () => {
    expect(describeFreshness(minutesAgo(20), now)).toBe('20 min ago');
    expect(describeFreshness(minutesAgo(59), now)).toBe('59 min ago');
  });

  it('switches to hours, singular and plural', () => {
    expect(describeFreshness(minutesAgo(60), now)).toBe('1 hour ago');
    expect(describeFreshness(minutesAgo(200), now)).toBe('3 hours ago');
  });

  it('switches to days', () => {
    expect(describeFreshness(minutesAgo(60 * 25), now)).toBe('yesterday');
    expect(describeFreshness(minutesAgo(60 * 50), now)).toBe('2 days ago');
  });

  /**
   * Devices disagree about the time. A sample stamped slightly in the future is
   * clock skew, not a reading from the future, and "in -3 minutes" would look
   * like a bug.
   */
  it('treats a future timestamp as just now rather than negative', () => {
    expect(describeFreshness(new Date(now.getTime() + 90_000), now)).toBe('just now');
  });
});

describe('isStale', () => {
  it('is false without a reading, so absence is not reported as staleness', () => {
    expect(isStale(null, now)).toBe(false);
  });

  it('ignores delays short enough to be a normal sync interval', () => {
    expect(isStale(minutesAgo(30), now)).toBe(false);
    expect(isStale(minutesAgo(119), now)).toBe(false);
  });

  it('flags anything beyond the threshold', () => {
    expect(isStale(minutesAgo(121), now)).toBe(true);
    expect(isStale(minutesAgo(60 * 6), now)).toBe(true);
  });

  it('accepts a custom threshold', () => {
    expect(isStale(minutesAgo(45), now, 30)).toBe(true);
  });
});
