import { cn } from '@/lib/utils';
import { type ContextTag, CONTEXT_TAG_INFO } from '@/types';

interface ContextTagPickerProps {
  value: ContextTag[];
  onChange: (tags: ContextTag[]) => void;
  label?: string;
}

const ALL_TAGS: ContextTag[] = ['stress', 'illness', 'travel', 'holiday', 'busy', 'rest', 'celebration'];

export function ContextTagPicker({
  value,
  onChange,
  label = 'Контекст',
}: ContextTagPickerProps) {
  const toggleTag = (tag: ContextTag) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  return (
    <div className="space-y-3">
      <span className="text-text-muted text-sm">{label}</span>

      <div className="flex flex-wrap gap-2">
        {ALL_TAGS.map((tag) => {
          const info = CONTEXT_TAG_INFO[tag];
          const isSelected = value.includes(tag);

          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                'transition-all duration-200 touch-feedback',
                isSelected
                  ? 'bg-primary/20 text-primary ring-1 ring-primary'
                  : 'glass hover:glass-hover text-text-muted'
              )}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
