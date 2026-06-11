import type { Habit, Weekday } from '@/types';

export function getWeekday(date: Date): Weekday {
  const jsDay = date.getDay();
  return (jsDay === 0 ? 6 : jsDay - 1) as Weekday;
}

function startOfDayMs(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isHabitScheduledOnDate(habit: Habit, date: Date): boolean {
  if (habit.type === 'goal' || !habit.isActive) return false;

  if (habit.frequency?.type === 'daily') return true;

  if (habit.frequency?.type === 'weekly_days') {
    return habit.frequency.weeklyDays?.includes(getWeekday(date)) ?? false;
  }

  if (habit.frequency?.type === 'interval') {
    const n = Math.max(1, habit.frequency.intervalDays ?? 1);
    const anchor = startOfDayMs(habit.createdAt ?? date);
    const diffDays = Math.round((startOfDayMs(date) - anchor) / 86_400_000);
    return diffDays >= 0 && diffDays % n === 0;
  }

  // For weekly quota habits show every day and let user choose when to complete.
  return true;
}

// Single source of truth for "did this habit count as done on a day with this value".
// Limit/quit habits are done when staying at or under the ceiling.
export function isHabitCompleted(
  habit: Pick<Habit, 'type' | 'target' | 'polarity' | 'limit'>,
  value: number
): boolean {
  if (habit.polarity === 'limit') return value <= (habit.limit ?? 0);
  if (habit.type === 'binary') return value > 0;
  if (habit.type === 'scale') return value >= (habit.target ?? 1);
  return false;
}
