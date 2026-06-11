import { cn } from '@/lib/utils';
import { type MoodLevel, MOOD_EMOJIS, MOOD_LABELS } from '@/types';

interface MoodPickerProps {
  value: MoodLevel | null;
  onChange: (value: MoodLevel) => void;
  label?: string;
}

const MOOD_LEVELS: MoodLevel[] = [1, 2, 3, 4, 5];

export function MoodPicker({ value, onChange, label = 'Настроение' }: MoodPickerProps) {
  return (
    <div className="space-y-3">
      <span className="text-text-muted text-sm">{label}</span>

      <div className="grid grid-cols-5 gap-1 sm:gap-2">
        {MOOD_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            aria-pressed={value === level}
            className={cn(
              'min-w-0 flex flex-col items-center gap-1 px-1 py-2 sm:p-3 rounded-xl transition-all duration-200',
              'touch-feedback hover:scale-105 active:scale-95',
              value === level
                ? 'bg-primary/20 ring-2 ring-primary scale-105'
                : 'glass hover:glass-hover'
            )}
            aria-label={MOOD_LABELS[level]}
          >
            <span className="text-xl sm:text-2xl">{MOOD_EMOJIS[level]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
