import type { Habit, Weekday } from '@/types';

export function getWeekday(date: Date): Weekday {
  const jsDay = date.getDay();
  return (jsDay === 0 ? 6 : jsDay - 1) as Weekday;
}

export function isHabitScheduledOnDate(habit: Habit, date: Date): boolean {
  if (habit.type === 'goal' || !habit.isActive) return false;

  if (habit.frequency?.type === 'daily') return true;

  if (habit.frequency?.type === 'weekly_days') {
    return habit.frequency.weeklyDays?.includes(getWeekday(date)) ?? false;
  }

  // For weekly quota habits show every day and let user choose when to complete.
  return true;
}
