/**
 * How stale a reading is, in words.
 *
 * Health data arrives through a chain the user cannot see: a band syncs to its
 * own app, that app writes to the health store, and only then can this one read
 * it. Each hop adds delay, and a total gives no hint of its own age -- 4,000
 * steps looks identical whether it was measured a minute ago or four hours ago.
 *
 * Saying so turns an invisible problem into a legible one: someone who knows
 * their steps are three hours old knows to force a sync, rather than concluding
 * the app is broken.
 */
export function describeFreshness(recordedAt: Date | null, now: Date): string | null {
  if (recordedAt == null) return null;

  const minutes = Math.floor((now.getTime() - recordedAt.getTime()) / 60_000);

  // A future timestamp means clock skew between devices, not a real reading.
  // Treating it as "just now" is better than "in -3 minutes".
  if (minutes < 0) return 'just now';

  // Below a few minutes there is nothing useful to say, and a number ticking
  // over every minute reads as busier than it is.
  if (minutes < 5) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/**
 * Whether the reading is old enough to be worth pointing out.
 *
 * Two hours is the threshold because below it a delay is usually just a device
 * sync interval, and flagging every one of those would make the warning
 * meaningless.
 */
export function isStale(recordedAt: Date | null, now: Date, thresholdMinutes = 120): boolean {
  if (recordedAt == null) return false;
  return now.getTime() - recordedAt.getTime() > thresholdMinutes * 60_000;
}
