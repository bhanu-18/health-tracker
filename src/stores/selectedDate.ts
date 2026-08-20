import { create } from 'zustand';
import { today } from '../lib/dates';

/**
 * Which day the dashboard is showing.
 *
 * Held in a store rather than screen state so History can open a day by tapping
 * its bar: the two live in different tabs, and route params do not survive a
 * tab switch. It resets to today whenever the app is relaunched, which is the
 * right default -- nobody opens a tracker wanting last Tuesday.
 */
type SelectedDateState = {
  date: string;
  setDate: (date: string) => void;
  goToToday: () => void;
};

export const useSelectedDate = create<SelectedDateState>((set) => ({
  date: today(),
  setDate: (date) => set({ date }),
  goToToday: () => set({ date: today() }),
}));
