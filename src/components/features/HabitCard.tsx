import { cn } from '@/lib/utils';
import type { Habit, HabitProgress } from '@/types';

interface HabitCardProps {
  habit: Habit;
  progress?: HabitProgress;
  onChange: (progress: HabitProgress) => void;
}

export function HabitCard({ habit, progress, onChange }: HabitCardProps) {
  const target = habit.target ?? 10;
  const value = progress?.value ?? 0;
  const isCompleted = habit.type === 'binary' ? value > 0 : value >= (habit.target ?? 1);

  const handleBinaryToggle = () => {
    onChange({
      habitId: habit.id,
      value: value > 0 ? 0 : 1,
    });
  };

  const handleScaleChange = (newValue: number) => {
    onChange({
      habitId: habit.id,
      value: Math.max(0, Math.min(newValue, target)),
    });
  };

  if (habit.type === 'binary') {
    return (
      <button
        type="button"
        onClick={handleBinaryToggle}
        className={cn(
          'w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200',
          'touch-feedback',
          isCompleted
            ? 'bg-primary/20 ring-1 ring-primary'
            : 'glass hover:glass-hover'
        )}
      >
        <span className="text-2xl">{habit.icon}</span>
        <span className="flex-1 text-left text-text">{habit.name}</span>

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
        <span className="text-2xl">{habit.icon}</span>
        <div className="flex-1">
          <div className="text-text">{habit.name}</div>
          <div className="text-xs text-text-dim">Используйте +/-, клик или перетаскивание ползунка</div>
        </div>
        <span className="text-text-muted text-sm">
          {value} / {target}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => handleScaleChange(value - 1)}
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
        onChange={(event) => handleScaleChange(Number(event.target.value))}
        className="w-full accent-primary"
        aria-label={`Прогресс привычки ${habit.name}`}
      />

        <button
          type="button"
          onClick={() => handleScaleChange(value + 1)}
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
