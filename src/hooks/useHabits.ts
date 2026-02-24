import { useLiveQuery } from 'dexie-react-hooks';
import { db, getActiveHabits, createHabit, updateHabit, deleteHabit } from '@/lib/db';

export function useHabits() {
  const habits = useLiveQuery(() => getActiveHabits(), []);

  return {
    habits: habits ?? [],
    isLoading: habits === undefined,
  };
}

export function useAllHabits() {
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), []);

  return {
    habits: habits ?? [],
    isLoading: habits === undefined,
    createHabit,
    updateHabit,
    deleteHabit,
  };
}
