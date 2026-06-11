import { useMemo } from 'react';
import { MoodPicker } from './MoodPicker';
import { EnergyPicker } from './EnergyPicker';
import { HabitCard } from './HabitCard';
import { ContextTagPicker } from './ContextTagPicker';
import { useDayEntry } from '@/hooks';
import { isHabitScheduledOnDate } from '@/lib/habitSchedule';
import { getDailyPrompt } from '@/lib/prompts';
import type { Habit } from '@/types';

interface DayEditorProps {
  date: Date;
  habits: Habit[];
}

// Editable day controls used inside History so a forgotten day can be back-filled
// right where the gap is visible in the heatmap.
export function DayEditor({ date, habits }: DayEditorProps) {
  const { entry, setMood, setEnergy, setHabitProgress, setNotes, setTags } = useDayEntry({ date });

  const scheduledHabits = useMemo(
    () => habits.filter((habit) => isHabitScheduledOnDate(habit, date)),
    [habits, date]
  );

  const prompt = getDailyPrompt(date);
  const applyPrompt = () => {
    const current = entry.notes ?? '';
    if (current.includes(prompt)) return;
    setNotes(current ? `${prompt}\n${current}` : `${prompt}\n`);
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-3">
          <MoodPicker value={entry.mood ?? null} onChange={setMood} />
        </div>
        <div className="glass rounded-xl p-3">
          <EnergyPicker value={entry.energy ?? null} onChange={setEnergy} />
        </div>
      </div>

      {scheduledHabits.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text">Привычки</h4>
          {scheduledHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              progress={entry.habits?.find((h) => h.habitId === habit.id)}
              onChange={setHabitProgress}
            />
          ))}
        </div>
      )}

      <div className="glass rounded-xl p-3">
        <ContextTagPicker value={entry.tags ?? []} onChange={setTags} />
      </div>

      <div>
        <button
          type="button"
          onClick={applyPrompt}
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-text-muted glass hover:glass-hover rounded-full px-3 py-1.5 touch-feedback"
          title="Добавить подсказку в заметку"
        >
          <span>💭</span>
          <span>{prompt}</span>
        </button>
        <textarea
          value={entry.notes ?? ''}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Как прошёл день? Что запомнилось?"
          className="w-full h-28 bg-transparent border border-border rounded-xl p-3 text-text placeholder:text-text-dim resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
    </div>
  );
}
