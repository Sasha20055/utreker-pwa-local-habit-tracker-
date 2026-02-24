import type { Habit, DayEntry } from '@/types';
import { getDateId } from './db';
import { isHabitScheduledOnDate } from './habitSchedule';

export interface HabitStats {
  habitId: string;
  currentStreak: number;
  bestStreak: number;
  completionRate: number; // 0-100%
  last7Days: boolean[]; // true = completed, false = not completed
  totalCompleted: number;
  totalDays: number;
}

// Check if habit should be tracked on a specific date
function shouldTrackOnDate(habit: Habit, date: Date): boolean {
  return isHabitScheduledOnDate(habit, date);
}

// Check if habit was completed on a specific day
function isCompletedOnDay(habit: Habit, dayEntry: DayEntry | undefined): boolean {
  if (!dayEntry) return false;

  const progress = dayEntry.habits.find(h => h.habitId === habit.id);
  if (!progress) return false;

  if (habit.type === 'binary') {
    return progress.value > 0;
  } else if (habit.type === 'scale') {
    return progress.value >= (habit.target ?? 1);
  }

  return false;
}

// Calculate streak (consecutive days of completion)
function calculateStreak(
  habit: Habit,
  entries: Map<string, DayEntry>,
  startDate: Date,
  direction: 'backward' | 'forward' = 'backward'
): number {
  let streak = 0;
  const currentDate = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Max 365 days to prevent infinite loop
  for (let i = 0; i < 365; i++) {
    if (direction === 'backward') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate > today) break;
    }

    // Skip days where habit shouldn't be tracked
    if (!shouldTrackOnDate(habit, currentDate)) continue;

    const dateId = getDateId(currentDate);
    const entry = entries.get(dateId);

    if (isCompletedOnDay(habit, entry)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Calculate best streak ever
function calculateBestStreak(habit: Habit, entries: DayEntry[]): number {
  if (entries.length === 0) return 0;

  // Sort entries by date
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let bestStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  for (const entry of sorted) {
    const entryDate = new Date(entry.date);

    if (!shouldTrackOnDate(habit, entryDate)) continue;

    const progress = entry.habits.find(h => h.habitId === habit.id);
    const isCompleted = progress && (
      habit.type === 'binary' ? progress.value > 0 : progress.value >= (habit.target ?? 1)
    );

    if (isCompleted) {
      if (lastDate) {
        // Check if consecutive (accounting for skipped days)
        const daysDiff = Math.floor((entryDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1 || (daysDiff > 1 && !hasTrackedDaysBetween(habit, lastDate, entryDate))) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      bestStreak = Math.max(bestStreak, currentStreak);
      lastDate = entryDate;
    } else {
      currentStreak = 0;
      lastDate = entryDate;
    }
  }

  return bestStreak;
}

// Check if there are tracked days between two dates
function hasTrackedDaysBetween(habit: Habit, start: Date, end: Date): boolean {
  const current = new Date(start);
  current.setDate(current.getDate() + 1);

  while (current < end) {
    if (shouldTrackOnDate(habit, current)) return true;
    current.setDate(current.getDate() + 1);
  }

  return false;
}

// Get last 7 days completion status
function getLast7Days(habit: Habit, entries: Map<string, DayEntry>): boolean[] {
  const result: boolean[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateId = getDateId(date);
    const entry = entries.get(dateId);

    result.push(isCompletedOnDay(habit, entry));
  }

  return result;
}

// Calculate completion rate for a period
function calculateCompletionRate(
  habit: Habit,
  entries: Map<string, DayEntry>,
  days: number
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let trackedDays = 0;
  let completedDays = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    if (!shouldTrackOnDate(habit, date)) continue;

    trackedDays++;
    const dateId = getDateId(date);
    const entry = entries.get(dateId);

    if (isCompletedOnDay(habit, entry)) {
      completedDays++;
    }
  }

  if (trackedDays === 0) return 0;
  return Math.round((completedDays / trackedDays) * 100);
}

// Calculate all stats for a habit
export function calculateHabitStats(habit: Habit, entries: DayEntry[]): HabitStats {
  const entriesMap = new Map<string, DayEntry>();
  entries.forEach(e => entriesMap.set(e.id, e));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if today is completed to determine streak start
  const todayId = getDateId(today);
  const todayEntry = entriesMap.get(todayId);
  const todayCompleted = isCompletedOnDay(habit, todayEntry);

  // Current streak: count backward from today (or yesterday if today not completed)
  const streakStartDate = new Date(today);
  let currentStreak = todayCompleted ? 1 : 0;
  currentStreak += calculateStreak(habit, entriesMap, streakStartDate, 'backward');

  return {
    habitId: habit.id,
    currentStreak,
    bestStreak: Math.max(calculateBestStreak(habit, entries), currentStreak),
    completionRate: calculateCompletionRate(habit, entriesMap, 30),
    last7Days: getLast7Days(habit, entriesMap),
    totalCompleted: entries.filter(e => isCompletedOnDay(habit, e)).length,
    totalDays: entries.length,
  };
}

// Calculate overall stats across all habits
export function calculateOverallStats(habits: Habit[], entries: DayEntry[]): {
  weeklyCompletionRate: number;
  bestHabit: { habit: Habit; rate: number } | null;
  activeGoals: Array<{ habit: Habit; progress: number; deadline?: Date }>;
} {
  if (habits.length === 0) {
    return { weeklyCompletionRate: 0, bestHabit: null, activeGoals: [] };
  }

  const entriesMap = new Map<string, DayEntry>();
  entries.forEach(e => entriesMap.set(e.id, e));

  // Calculate weekly completion rate
  const regularHabits = habits.filter(h => h.type !== 'goal');
  let totalRate = 0;
  let bestHabit: { habit: Habit; rate: number } | null = null;

  for (const habit of regularHabits) {
    const rate = calculateCompletionRate(habit, entriesMap, 7);
    totalRate += rate;

    if (!bestHabit || rate > bestHabit.rate) {
      bestHabit = { habit, rate };
    }
  }

  const weeklyCompletionRate = regularHabits.length > 0
    ? Math.round(totalRate / regularHabits.length)
    : 0;

  // Get active goals
  const activeGoals = habits
    .filter(h => h.type === 'goal' && h.isActive)
    .map(h => ({
      habit: h,
      progress: h.goalTarget !== undefined && h.goalCurrent !== undefined
        ? Math.round((h.goalCurrent / h.goalTarget) * 100)
        : 0,
      deadline: h.goalDeadline,
    }));

  return { weeklyCompletionRate, bestHabit, activeGoals };
}
