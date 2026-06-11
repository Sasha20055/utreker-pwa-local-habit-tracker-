import type { Habit, DayEntry } from '@/types';
import { SKIP_TAGS } from '@/types';
import { getDateId } from './db';
import { isHabitScheduledOnDate, isHabitCompleted } from './habitSchedule';
import { startOfWeekMonday } from './utils';

export interface HabitStats {
  habitId: string;
  currentStreak: number; // days, or consecutive met weeks for weekly-quota habits
  bestStreak: number;
  completionRate: number; // 0-100%: scheduled days for daily habits, met weeks for weekly-quota
  completedDays: number; // completed days (or met weeks) inside the window
  trackedDays: number; // scheduled non-skipped days (or completed weeks) inside the window
  last7Days: boolean[]; // true = completed, false = not completed
  totalCompleted: number;
  totalDays: number;
  weekly?: { doneThisWeek: number; target: number }; // present for weekly-quota habits
}

// Check if habit should be tracked on a specific date
function shouldTrackOnDate(habit: Habit, date: Date): boolean {
  return isHabitScheduledOnDate(habit, date);
}

// A day is "excused" (skipped) when the user tagged it as a planned/unavoidable off-day.
// Excused days never count as a miss and don't break a streak.
function isExcusedDay(entry: DayEntry | undefined): boolean {
  if (!entry) return false;
  return entry.tags?.some((tag) => SKIP_TAGS.includes(tag)) ?? false;
}

// Check if habit was completed on a specific day. For limit/quit habits a day with no
// entry means the bad thing didn't happen, so it counts as success.
function isCompletedOnDay(habit: Habit, dayEntry: DayEntry | undefined): boolean {
  const progress = dayEntry?.habits.find(h => h.habitId === habit.id);
  return isHabitCompleted(habit, progress?.value ?? 0);
}

// Calculate streak (consecutive days of completion). Excused (skip-tagged) days are
// passed over without breaking the streak.
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

    // Skip-tagged days (illness/travel/…) don't break or extend the streak
    if (isExcusedDay(entry)) continue;

    if (isCompletedOnDay(habit, entry)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Calculate best streak ever
function calculateBestStreak(
  habit: Habit,
  entries: DayEntry[],
  entriesMap: Map<string, DayEntry>
): number {
  if (entries.length === 0) return 0;

  // Sort entries by date, ignoring excused days entirely
  const sorted = [...entries]
    .filter((entry) => !isExcusedDay(entry))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let bestStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  for (const entry of sorted) {
    const entryDate = new Date(entry.date);

    if (!shouldTrackOnDate(habit, entryDate)) continue;

    const isCompleted = isCompletedOnDay(habit, entry);

    if (isCompleted) {
      if (lastDate) {
        // Check if consecutive (accounting for skipped/unscheduled days)
        const daysDiff = Math.floor((entryDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1 || (daysDiff > 1 && !hasTrackedDaysBetween(habit, lastDate, entryDate, entriesMap))) {
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

// Check if there are tracked (scheduled, non-excused) days between two dates
function hasTrackedDaysBetween(
  habit: Habit,
  start: Date,
  end: Date,
  entriesMap: Map<string, DayEntry>
): boolean {
  const current = new Date(start);
  current.setDate(current.getDate() + 1);

  while (current < end) {
    if (shouldTrackOnDate(habit, current) && !isExcusedDay(entriesMap.get(getDateId(current)))) {
      return true;
    }
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

// Calculate completion (consistency) over a period. Excused days are excluded from the
// denominator so planned off-days never lower the rate.
function calculateCompletion(
  habit: Habit,
  entries: Map<string, DayEntry>,
  days: number
): { rate: number; completed: number; tracked: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let trackedDays = 0;
  let completedDays = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    if (!shouldTrackOnDate(habit, date)) continue;

    const dateId = getDateId(date);
    const entry = entries.get(dateId);

    if (isExcusedDay(entry)) continue;

    trackedDays++;
    if (isCompletedOnDay(habit, entry)) {
      completedDays++;
    }
  }

  if (trackedDays === 0) return { rate: 0, completed: 0, tracked: 0 };
  return {
    rate: Math.round((completedDays / trackedDays) * 100),
    completed: completedDays,
    tracked: trackedDays,
  };
}

// --- Weekly-quota (N times per week) habits are evaluated per ISO week, not per day,
// so the days you skip inside a week aren't counted as misses. ---

function weeklyDoneCount(
  habit: Habit,
  entries: Map<string, DayEntry>,
  weekStart: Date,
  today: Date
): number {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    if (date > today) break;
    if (isCompletedOnDay(habit, entries.get(getDateId(date)))) count++;
  }
  return count;
}

function calculateWeeklyStats(
  habit: Habit,
  entries: Map<string, DayEntry>,
  windowDays: number
): {
  currentStreak: number;
  bestStreak: number;
  rate: number;
  doneThisWeek: number;
  target: number;
  metWeeks: number;
  completedWeeks: number;
} {
  const target = Math.max(1, habit.frequency.timesPerWeek ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeekStart = startOfWeekMonday(today);
  const doneThisWeek = weeklyDoneCount(habit, entries, thisWeekStart, today);

  // Current streak in weeks — the in-progress week counts only once its quota is met.
  let currentStreak = doneThisWeek >= target ? 1 : 0;
  const back = new Date(thisWeekStart);
  back.setDate(back.getDate() - 7);
  for (let w = 0; w < 53; w++) {
    if (weeklyDoneCount(habit, entries, back, today) >= target) currentStreak++;
    else break;
    back.setDate(back.getDate() - 7);
  }

  // Rate + best streak over completed weeks within the window (current week excluded).
  const windowStartDay = new Date(today);
  windowStartDay.setDate(windowStartDay.getDate() - (windowDays - 1));
  const windowStart = startOfWeekMonday(windowStartDay);
  const lastCompleted = new Date(thisWeekStart);
  lastCompleted.setDate(lastCompleted.getDate() - 7);

  let metWeeks = 0;
  let completedWeeks = 0;
  let bestStreak = 0;
  let run = 0;
  const cursor = new Date(windowStart);
  while (cursor <= lastCompleted) {
    const met = weeklyDoneCount(habit, entries, cursor, today) >= target;
    completedWeeks++;
    if (met) {
      metWeeks++;
      run++;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
    cursor.setDate(cursor.getDate() + 7);
  }
  if (doneThisWeek >= target) bestStreak = Math.max(bestStreak, run + 1);

  const rate = completedWeeks > 0
    ? Math.round((metWeeks / completedWeeks) * 100)
    : Math.round(Math.min(1, doneThisWeek / target) * 100);

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    rate,
    doneThisWeek,
    target,
    metWeeks,
    completedWeeks,
  };
}

// Calculate all stats for a habit
export function calculateHabitStats(habit: Habit, entries: DayEntry[]): HabitStats {
  const entriesMap = new Map<string, DayEntry>();
  entries.forEach(e => entriesMap.set(e.id, e));

  // Weekly-quota habits use week-based evaluation
  if (habit.frequency?.type === 'weekly_times') {
    const w = calculateWeeklyStats(habit, entriesMap, 30);
    return {
      habitId: habit.id,
      currentStreak: w.currentStreak,
      bestStreak: w.bestStreak,
      completionRate: w.rate,
      completedDays: w.metWeeks,
      trackedDays: w.completedWeeks,
      last7Days: getLast7Days(habit, entriesMap),
      totalCompleted: entries.filter(e => isCompletedOnDay(habit, e)).length,
      totalDays: entries.length,
      weekly: { doneThisWeek: w.doneThisWeek, target: w.target },
    };
  }

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

  const completion = calculateCompletion(habit, entriesMap, 30);

  return {
    habitId: habit.id,
    currentStreak,
    bestStreak: Math.max(calculateBestStreak(habit, entries, entriesMap), currentStreak),
    completionRate: completion.rate,
    completedDays: completion.completed,
    trackedDays: completion.tracked,
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
    const rate = calculateCompletion(habit, entriesMap, 7).rate;
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
