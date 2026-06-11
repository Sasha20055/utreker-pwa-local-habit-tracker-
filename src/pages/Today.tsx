import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent } from '@/components/ui';
import {
  MoodPicker,
  EnergyPicker,
  HabitCard,
  ContextTagPicker,
} from '@/components/features';
import { useDayEntry, useHabits, usePageTitle } from '@/hooks';
import { formatDate, startOfWeekMonday, cn } from '@/lib/utils';
import { getDailyPrompt } from '@/lib/prompts';
import { isHabitScheduledOnDate, isHabitCompleted } from '@/lib/habitSchedule';
import { updateHabit, getDayEntries, getDateId } from '@/lib/db';
import type { DayEntry, Habit } from '@/types';

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function GoalTrackerCard({
  goal,
  todayValue,
  onStep,
  onSet,
}: {
  goal: Habit;
  todayValue: number;
  onStep: (goal: Habit, delta: number) => void;
  onSet: (goal: Habit, value: number) => void;
}) {
  const target = goal.goalTarget ?? 1;
  const total = goal.goalCurrent ?? 0;
  const progressPercent = Math.round((total / target) * 100);
  const reached = total >= target;
  const unit = goal.goalUnit ?? '';

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{goal.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-text font-medium truncate">{goal.name}</div>
            <div className="text-xs text-text-dim">Всего: {total}/{target} {unit}</div>
          </div>
          <span className={cn('text-sm font-medium', reached ? 'text-primary' : 'text-text-muted')}>
            {progressPercent}%
          </span>
        </div>

        <div className="h-2 bg-surface rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>

        {reached && (
          <div className="text-xs text-primary mb-3">🎉 Цель достигнута!</div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-text-muted">Сегодня</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStep(goal, -1)}
              disabled={todayValue <= 0}
              className="w-9 h-9 rounded-full glass hover:glass-hover touch-feedback disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Уменьшить сегодняшний вклад"
            >
              -
            </button>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={todayValue}
              onChange={(event) => onSet(goal, Number(event.target.value))}
              className="w-16 text-center px-2 py-1.5 bg-transparent border border-border rounded-xl text-text"
              aria-label={`Вклад за сегодня в цель ${goal.name}`}
            />
            <button
              type="button"
              onClick={() => onStep(goal, 1)}
              className="w-9 h-9 rounded-full glass hover:glass-hover touch-feedback"
              aria-label="Увеличить сегодняшний вклад"
            >
              +
            </button>
            {unit && <span className="text-xs text-text-dim w-10">{unit}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Today() {
  usePageTitle('Сегодня — ежедневный трекер привычек');
  const [selectedDate, setSelectedDate] = useState(() => normalizeDate(new Date()));
  const today = normalizeDate(new Date());
  const isToday = selectedDate.getTime() === today.getTime();

  const { entry, isSaving, setMood, setEnergy, setHabitProgress, setNotes, setTags } =
    useDayEntry({ date: selectedDate });
  const { habits, isLoading: habitsLoading } = useHabits();
  const activeGoals = useMemo(
    () => habits.filter((habit) => habit.type === 'goal' && habit.isActive),
    [habits]
  );
  const scheduledHabits = useMemo(
    () => habits.filter((habit) => isHabitScheduledOnDate(habit, selectedDate)),
    [habits, selectedDate]
  );

  // Entries for the selected date's week — used to show weekly-quota progress ("2/3 на неделе")
  const weekStart = useMemo(() => startOfWeekMonday(selectedDate), [selectedDate]);
  const weekStartId = getDateId(weekStart);
  const weekEntries = useLiveQuery(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return getDayEntries(weekStart, weekEnd);
  }, [weekStartId]);

  const weeklyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const weeklyHabits = habits.filter((h) => h.frequency?.type === 'weekly_times');
    if (weeklyHabits.length === 0) return counts;

    const weekMap = new Map<string, DayEntry>();
    weekEntries?.forEach((e) => weekMap.set(e.id, e));
    const selectedId = getDateId(selectedDate);

    for (const habit of weeklyHabits) {
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const id = getDateId(date);
        // Use the optimistic local entry for the selected day for instant feedback
        const dayHabits = id === selectedId ? (entry.habits ?? []) : (weekMap.get(id)?.habits ?? []);
        const p = dayHabits.find((h) => h.habitId === habit.id);
        if (isHabitCompleted(habit, p?.value ?? 0)) count++;
      }
      counts.set(habit.id, count);
    }
    return counts;
  }, [habits, weekEntries, weekStart, selectedDate, entry]);

  const shiftDate = (days: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return normalizeDate(next);
    });
  };

  const handleDateInputChange = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return;
    setSelectedDate(normalizeDate(new Date(year, month - 1, day)));
  };
  // Goal progress is stored per day (as a HabitProgress entry) so history is accurate and
  // sync-safe; goalCurrent is kept as a cached running total updated by the day's delta.
  const setGoalToday = async (goal: Habit, nextValue: number) => {
    const v = Math.max(0, Math.round(Number.isFinite(nextValue) ? nextValue : 0));
    const prev = entry.habits?.find((h) => h.habitId === goal.id)?.value ?? 0;
    if (v === prev) return;

    setHabitProgress({ habitId: goal.id, value: v });
    const newTotal = Math.max(0, (goal.goalCurrent ?? 0) + (v - prev));
    await updateHabit(goal.id, { goalCurrent: newTotal });
  };
  const stepGoalToday = (goal: Habit, delta: number) => {
    const prev = entry.habits?.find((h) => h.habitId === goal.id)?.value ?? 0;
    void setGoalToday(goal, prev + delta);
  };

  const reflectionPrompt = getDailyPrompt(selectedDate);
  const applyPrompt = () => {
    const current = entry.notes ?? '';
    if (current.includes(reflectionPrompt)) return;
    setNotes(current ? `${reflectionPrompt}\n${current}` : `${reflectionPrompt}\n`);
  };

  return (
    <div className="flex-1 pb-24 lg:pb-8 px-4 lg:px-6 pt-6 lg:pt-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-text-muted text-sm">{formatDate(selectedDate)}</p>
          <span aria-live="polite" className="text-xs text-text-dim">
            {isSaving ? 'Сохранение…' : ''}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-text">Как твой день?</h1>
        <div className="mt-3 grid grid-cols-[2.5rem_1fr_2.5rem] sm:grid-cols-[2.5rem_1fr_2.5rem_auto] gap-2">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="h-10 rounded-xl glass hover:glass-hover touch-feedback"
            aria-label="Предыдущий день"
          >
            ←
          </button>
          <input
            type="date"
            value={toInputDate(selectedDate)}
            onChange={(event) => handleDateInputChange(event.target.value)}
            className="h-10 px-3 py-2 bg-transparent border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="h-10 rounded-xl glass hover:glass-hover touch-feedback"
            aria-label="Следующий день"
          >
            →
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="h-10 col-span-3 sm:col-span-1 px-3 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            >
              Сегодня
            </button>
          )}
        </div>
      </header>

      <div className="grid xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-8">
          {/* Quick log: mood & energy in one glanceable card */}
          <section>
            <Card>
              <CardContent className="space-y-5">
                <MoodPicker
                  value={entry.mood ?? null}
                  onChange={setMood}
                />
                <EnergyPicker
                  value={entry.energy ?? null}
                  onChange={setEnergy}
                />
              </CardContent>
            </Card>
          </section>

          {/* Habits */}
          <section>
            <h2 className="text-lg font-semibold text-text mb-4">Привычки</h2>

            {habitsLoading ? (
              <div className="text-text-muted text-center py-8">Загрузка...</div>
            ) : scheduledHabits.length === 0 ? (
              <Card>
                <CardContent>
                  <p className="text-text-muted text-center py-4">
                    На эту дату нет привычек по расписанию
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {scheduledHabits.map((habit) => {
                  const progress = entry.habits?.find((h) => h.habitId === habit.id);
                  const weekly = habit.frequency?.type === 'weekly_times'
                    ? {
                        done: weeklyCounts.get(habit.id) ?? 0,
                        target: Math.max(1, habit.frequency.timesPerWeek ?? 1),
                      }
                    : undefined;
                  return (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      progress={progress}
                      onChange={setHabitProgress}
                      weekly={weekly}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Goals */}
          <section>
            <h2 className="text-lg font-semibold text-text mb-4">Цели</h2>
            {activeGoals.length === 0 ? (
              <Card>
                <CardContent>
                  <p className="text-text-muted text-center py-4">
                    Нет активных целей
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid lg:grid-cols-2 gap-3">
                {activeGoals.map((goal) => (
                  <GoalTrackerCard
                    key={goal.id}
                    goal={goal}
                    todayValue={entry.habits?.find((h) => h.habitId === goal.id)?.value ?? 0}
                    onStep={stepGoalToday}
                    onSet={setGoalToday}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="xl:col-span-5 space-y-8">
          {/* Context Tags */}
          <section>
            <Card>
              <CardContent>
                <ContextTagPicker
                  value={entry.tags ?? []}
                  onChange={setTags}
                />
              </CardContent>
            </Card>
          </section>

          {/* Notes */}
          <section>
            <Card>
              <CardContent>
                <label className="block text-text-muted text-sm mb-2">Заметки</label>
                <button
                  type="button"
                  onClick={applyPrompt}
                  className="mb-2 inline-flex items-center gap-1.5 text-xs text-text-muted glass hover:glass-hover rounded-full px-3 py-1.5 touch-feedback"
                  title="Добавить подсказку в заметку"
                >
                  <span>💭</span>
                  <span>{reflectionPrompt}</span>
                </button>
                <textarea
                  value={entry.notes ?? ''}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Как прошёл день? Что запомнилось?"
                  className="w-full h-40 xl:h-[24rem] bg-transparent border border-border rounded-xl p-3 text-text placeholder:text-text-dim resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
