import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui';
import {
  MoodPicker,
  EnergyPicker,
  HabitCard,
  ContextTagPicker,
} from '@/components/features';
import { useDayEntry, useHabits } from '@/hooks';
import { formatDate } from '@/lib/utils';
import { isHabitScheduledOnDate } from '@/lib/habitSchedule';
import { updateHabit } from '@/lib/db';
import type { Habit } from '@/types';

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
  onStepChange,
  onSliderChange,
}: {
  goal: Habit;
  onStepChange: (goal: Habit, delta: number) => void;
  onSliderChange: (goal: Habit, value: number) => void;
}) {
  const target = goal.goalTarget ?? 1;
  const current = goal.goalCurrent ?? 0;
  const progressPercent = Math.round((current / target) * 100);

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{goal.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-text font-medium truncate">{goal.name}</div>
            <div className="text-xs text-text-dim">Трекинг прогресса цели</div>
          </div>
          <span className="text-sm text-text-muted">
            {current}/{target} {goal.goalUnit ?? ''}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={target}
          step={1}
          value={current}
          onChange={(event) => onSliderChange(goal, Number(event.target.value))}
          className="w-full accent-primary mb-3"
          aria-label={`Прогресс цели ${goal.name}`}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{progressPercent}% выполнено</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStepChange(goal, -1)}
              disabled={current <= 0}
              className="w-9 h-9 rounded-full glass hover:glass-hover touch-feedback disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Уменьшить прогресс цели"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => onStepChange(goal, 1)}
              disabled={current >= target}
              className="w-9 h-9 rounded-full glass hover:glass-hover touch-feedback disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Увеличить прогресс цели"
            >
              +
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Today() {
  const [selectedDate, setSelectedDate] = useState(() => normalizeDate(new Date()));
  const today = normalizeDate(new Date());
  const isToday = selectedDate.getTime() === today.getTime();

  const { entry, setMood, setEnergy, setHabitProgress, setNotes, setTags } =
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
  const setGoalProgress = async (goal: Habit, nextValue: number) => {
    const target = goal.goalTarget ?? 1;
    const current = goal.goalCurrent ?? 0;
    const boundedValue = Math.max(0, Math.min(target, nextValue));

    if (boundedValue === current) return;

    await updateHabit(goal.id, { goalCurrent: boundedValue });
  };
  const updateGoalProgress = async (goal: Habit, delta: number) => {
    const current = goal.goalCurrent ?? 0;
    await setGoalProgress(goal, current + delta);
  };

  return (
    <div className="flex-1 pb-24 lg:pb-8 px-4 lg:px-6 pt-6 lg:pt-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <header className="mb-6">
        <p className="text-text-muted text-sm">{formatDate(selectedDate)}</p>
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
          {/* Mood & Energy */}
          <section className="grid xl:grid-cols-2 gap-6">
            <Card>
              <CardContent>
                <MoodPicker
                  value={entry.mood ?? null}
                  onChange={setMood}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
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
                  return (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      progress={progress}
                      onChange={setHabitProgress}
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
                    onStepChange={updateGoalProgress}
                    onSliderChange={setGoalProgress}
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
                <textarea
                  value={entry.notes ?? ''}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Как прошёл день? Что запомнилось?"
                  className="w-full h-40 xl:h-[26rem] bg-transparent border border-border rounded-xl p-3 text-text placeholder:text-text-dim resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
