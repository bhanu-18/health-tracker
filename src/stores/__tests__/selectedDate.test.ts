import { today } from '../../lib/dates';
import { useSelectedDate } from '../selectedDate';

/**
 * The store is shared rather than screen-local so History can open a day that
 * the dashboard then shows: the two live in different tabs, and route params do
 * not survive a tab switch.
 */
describe('useSelectedDate', () => {
  afterEach(() => {
    useSelectedDate.getState().goToToday();
  });

  it('starts on today', () => {
    // Nobody opens a tracker wanting to see last Tuesday.
    expect(useSelectedDate.getState().date).toBe(today());
  });

  it('moves to a chosen day', () => {
    useSelectedDate.getState().setDate('2026-08-14');
    expect(useSelectedDate.getState().date).toBe('2026-08-14');
  });

  it('returns to today on request', () => {
    useSelectedDate.getState().setDate('2026-08-14');
    useSelectedDate.getState().goToToday();
    expect(useSelectedDate.getState().date).toBe(today());
  });
});
