import { randomUUID } from 'expo-crypto';

/**
 * Primary keys are UUIDs generated on the device, not autoincrementing integers.
 *
 * This matters for the Supabase sync that comes later: with device-generated
 * ids, a row created offline keeps the same identity once it reaches the
 * server, and two family members' phones cannot mint the same id. Sequential
 * integers would collide the moment a second device existed, and renumbering
 * rows after the fact breaks every foreign key pointing at them.
 */
export const newId = (): string => randomUUID();
