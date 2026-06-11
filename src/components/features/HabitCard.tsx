import { cn } from '@/lib/utils';
import { isHabitCompleted } from '@/lib/habitSchedule';
import type { Habit, HabitProgress } from '@/types';

interface HabitCardProps {
  habit: Habit;
  progress?: HabitProgress;
  onChange: (progress: HabitProgress) => void;
  weekly?: { done: number; target: number };
}

function WeeklyBadge({ weekly }: { weekly: { done: number; target: number } }) {
  const met = weekly.done >= weekly.target;
  return (
    <span
      className={cn(
        'text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap',
        met ? 'bg-primary/20 text-primary' : 'bg-surface text-text-muted'
      )}
    >
      {met ? '✓ ' : ''}{weekly.done}/{weekly.target} на неделе
    </span>
  );
}

function IconBadge({ habit }: { habit: Habit }) {
  return (
    <span
      className="text-2xl w-9 h-9 flex items-center justify-center rounded-lg shrink-0"
      style={habit.color ? { backgroundColor: `${habit.color}2e` } : undefined}
    >
      {habit.icon}
    </span>
  );
}

export function HabitCard({ habit, progress, onChange, weekly }: HabitCardProps) {
  const target = habit.target ?? 10;
  const value = progress?.value ?? 0;
  const isCompleted = isHabitCompleted(habit, value);

  const setValue = (newValue: number, max?: number) => {
    const clamped = max !== undefined ? Math.min(newValue, max) : newValue;
    onChange({ habitId: habit.id, value: Math.max(0, clamped) });
  };

  // Limit / quit habits: success = staying at or under the ceiling (never punitive)
  if (habit.polarity === 'limit') {
    const limit = habit.limit ?? 0;
    const ok = value <= limit;
    return (
      <div
        className={cn(
          'p-4 rounded-xl transition-all duration-200',
          ok ? 'glass' : 'bg-amber-500/10 ring-1 ring-amber-500/40'
        )}
      >
        <div className="flex items-center gap-4 mb-3">
          <IconBadge habit={habit} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-text">{habit.name}</span>
              {weekly && <WeeklyBadge weekly={weekly} />}
            </div>
            <div className="text-xs text-text-dim">
              {limit === 0 ? 'Цель — не делать' : `Не больше ${limit} в день`}
            </div>
          </div>
          <span className={cn('text-sm font-medium', ok ? 'text-primary' : 'text-amber-400')}>
            {value}{limit > 0 ? ` / ${limit}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setValue(value - 1)}
            disabled={value <= 0}
            className="w-10 h-10 rounded-full glass flex items-center justify-center touch-feedback hover:glass-hover disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Уменьшить"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <div className="flex-1 text-center text-xs text-text-muted">
            {ok ? 'В пределах лимита' : 'Над лимитом'}
          </div>
          <button
            type="button"
            onClick={() => setValue(value + 1)}
            className="w-10 h-10 rounded-full glass flex items-center justify-center touch-feedback hover:glass-hover"
            aria-label="Увеличить"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (habit.type === 'binary') {
    return (
      <button
        type="button"
        onClick={() => setValue(value > 0 ? 0 : 1)}
        aria-pressed={isCompleted}
        className={cn(
          'w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200',
          'touch-feedback',
          isCompleted
            ? 'bg-primary/20 ring-1 ring-primary'
            : 'glass hover:glass-hover'
        )}
      >
        <IconBadge habit={habit} />
        <span className="flex-1 text-left text-text">{habit.name}</span>
        {weekly && <WeeklyBadge weekly={weekly} />}

        <div
          className={cn(
            'w-6 h-6 rounded-full border-2 transition-all duration-200 flex items-center justify-center',
            isCompleted
              ? 'bg-primary border-primary'
              : 'border-border'
          )}
        >
          {isCompleted && (
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </button>
    );
  }

  // Scale type
  return (
    <div
      className={cn(
        'p-4 rounded-xl transition-all duration-200',
        isCompleted
          ? 'bg-primary/20 ring-1 ring-primary'
          : 'glass'
      )}
    >
      <div className="flex items-center gap-4 mb-3">
        <IconBadge habit={habit} />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-text">{habit.name}</span>
            {weekly && <WeeklyBadge weekly={weekly} />}
          </div>
          <div className="text-xs text-text-dim">Используйте +/-, клик или перетаскивание ползунка</div>
        </div>
        <span className="text-text-muted text-sm">
          {value} / {target}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setValue(value - 1, target)}
          disabled={value <= 0}
          className={cn(
            'w-10 h-10 rounded-full glass flex items-center justify-center',
            'touch-feedback hover:glass-hover',
            'disabled:opacity-50 disabled:pointer-events-none'
          )}
          aria-label="Уменьшить"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        <input
          type="range"
          min={0}
          max={target}
          step={1}
          value={value}
          onChange={(event) => setValue(Number(event.target.value), target)}
          className="w-full accent-primary"
          aria-label={`Прогресс привычки ${habit.name}`}
        />

        <button
          type="button"
          onClick={() => setValue(value + 1, target)}
          disabled={value >= target}
          className={cn(
            'w-10 h-10 rounded-full glass flex items-center justify-center',
            'touch-feedback hover:glass-hover',
            'disabled:opacity-50 disabled:pointer-events-none'
          )}
          aria-label="Увеличить"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
