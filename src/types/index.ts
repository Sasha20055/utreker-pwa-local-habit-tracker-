// Mood and Energy levels (1-5)
export type MoodLevel = 1 | 2 | 3 | 4 | 5;
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

// Habit types
export type HabitType = 'binary' | 'scale' | 'goal';

// Habit category
export type BuiltinHabitCategory = 'health' | 'productivity' | 'growth' | 'finance' | 'other';
export type HabitCategory = BuiltinHabitCategory | string;

// Frequency type for periodic habits
export type FrequencyType = 'daily' | 'weekly_days' | 'weekly_times' | 'interval';

// Polarity: positive habits to build, or "limit" habits to reduce/quit
export type HabitPolarity = 'positive' | 'limit';

// Weekday for scheduling
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday, 6 = Sunday

// Habit frequency configuration
export interface HabitFrequency {
  type: FrequencyType;
  weeklyDays?: Weekday[]; // For 'weekly_days': specific days like [0, 2, 4] (Mon, Wed, Fri)
  timesPerWeek?: number;  // For 'weekly_times': e.g., 3 times per week
  intervalDays?: number;  // For 'interval': every N days (e.g., 3)
}

// Habit definition (settings)
export interface Habit {
  id: string;
  name: string;
  icon: string;
  type: HabitType;
  category: HabitCategory;
  target?: number; // For scale type: max value (e.g., 8 glasses of water)
  color?: string;  // Optional accent color (hex), overrides category color
  polarity?: HabitPolarity; // 'limit' = stay at or under `limit` (e.g. quit smoking)
  limit?: number;  // For polarity 'limit': max allowed per day (0 = fully quit)
  frequency: HabitFrequency;
  // For goal type
  goalTarget?: number;   // Total target (e.g., 52 books)
  goalCurrent?: number;  // Current progress (e.g., 12 books)
  goalDeadline?: Date;   // Deadline for the goal
  goalUnit?: string;     // Unit label (e.g., "книг", "км")
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Category info for UI
export const HABIT_CATEGORIES: Record<BuiltinHabitCategory, { label: string; icon: string; color: string }> = {
  health: { label: 'Здоровье', icon: '💪', color: '#10B981' },
  productivity: { label: 'Продуктивность', icon: '🚀', color: '#6366F1' },
  growth: { label: 'Развитие', icon: '📚', color: '#F59E0B' },
  finance: { label: 'Финансы', icon: '💰', color: '#14B8A6' },
  other: { label: 'Другое', icon: '✨', color: '#8B5CF6' },
};

const CUSTOM_CATEGORY_META = { label: 'Кастомная', icon: '🏷️', color: '#64748B' } as const;

export function getHabitCategoryMeta(category: HabitCategory): {
  label: string;
  icon: string;
  color: string;
} {
  if (category in HABIT_CATEGORIES) {
    return HABIT_CATEGORIES[category as BuiltinHabitCategory];
  }

  return {
    ...CUSTOM_CATEGORY_META,
    label: category.trim() || CUSTOM_CATEGORY_META.label,
  };
}

// Weekday labels
export const WEEKDAY_LABELS: Record<Weekday, { short: string; full: string }> = {
  0: { short: 'Пн', full: 'Понедельник' },
  1: { short: 'Вт', full: 'Вторник' },
  2: { short: 'Ср', full: 'Среда' },
  3: { short: 'Чт', full: 'Четверг' },
  4: { short: 'Пт', full: 'Пятница' },
  5: { short: 'Сб', full: 'Суббота' },
  6: { short: 'Вс', full: 'Воскресенье' },
};

// Habit progress for a specific day
export interface HabitProgress {
  habitId: string;
  value: number; // 0/1 for binary, 0-target for scale
}

// Context tags for explaining days
export type ContextTag =
  | 'stress'
  | 'illness'
  | 'travel'
  | 'holiday'
  | 'busy'
  | 'rest'
  | 'celebration';

// Day entry - the central entity
export interface DayEntry {
  id: string; // YYYY-MM-DD format
  date: Date;
  mood: MoodLevel | null;
  energy: EnergyLevel | null;
  habits: HabitProgress[];
  notes: string;
  tags: ContextTag[];
  createdAt: Date;
  updatedAt: Date;
}

// For creating/updating entries
export type DayEntryInput = Omit<DayEntry, 'id' | 'createdAt' | 'updatedAt'>;

// Mood emoji mapping
export const MOOD_EMOJIS: Record<MoodLevel, string> = {
  1: '\u{1F61E}', // Disappointed face
  2: '\u{1F615}', // Confused face
  3: '\u{1F610}', // Neutral face
  4: '\u{1F642}', // Slightly smiling face
  5: '\u{1F60A}', // Smiling face with smiling eyes
};

export const MOOD_LABELS: Record<MoodLevel, string> = {
  1: 'Плохо',
  2: 'Не очень',
  3: 'Нормально',
  4: 'Хорошо',
  5: 'Отлично',
};

// Energy emoji mapping
export const ENERGY_EMOJIS: Record<EnergyLevel, string> = {
  1: '\u{1F6CF}\uFE0F', // Bed
  2: '\u{1F634}', // Sleeping face
  3: '\u26A1', // Lightning
  4: '\u{1F525}', // Fire
  5: '\u{1F680}', // Rocket
};

export const ENERGY_LABELS: Record<EnergyLevel, string> = {
  1: 'Нет сил',
  2: 'Усталость',
  3: 'Норма',
  4: 'Бодрость',
  5: 'Энергия!',
};

// Tags that excuse a day from breaking a streak (planned/unavoidable off-days).
// A tagged day is skipped: it doesn't count as a miss and doesn't lower the completion rate.
export const SKIP_TAGS: ContextTag[] = ['illness', 'travel', 'holiday', 'rest'];

// Tags that confound mood/energy correlations: on these days both state and behavior
// collapse together (e.g. illness), which manufactures false correlations. Excluded from the sample.
export const CONFOUNDING_TAGS: ContextTag[] = ['illness', 'stress', 'travel'];

// Soft-deletion marker propagated across devices so a deletion isn't undone by sync.
export interface Tombstone {
  key: string; // `${type}:${entityId}`
  type: 'habit' | 'day';
  entityId: string;
  deletedAt: Date;
}

// Context tag labels and icons
export const CONTEXT_TAG_INFO: Record<ContextTag, { label: string; icon: string }> = {
  stress: { label: 'Стресс', icon: '\u{1F4A2}' },
  illness: { label: 'Болезнь', icon: '\u{1FA92}' },
  travel: { label: 'Поездка', icon: '\u2708\uFE0F' },
  holiday: { label: 'Отдых', icon: '\u{1F3D6}\uFE0F' },
  busy: { label: 'Занятость', icon: '\u{1F4BC}' },
  rest: { label: 'Отдых', icon: '\u{1F6CB}\uFE0F' },
  celebration: { label: 'Праздник', icon: '\u{1F389}' },
};

// Default frequency for daily habits
const DAILY_FREQUENCY: HabitFrequency = { type: 'daily' };

// Default habits for new users
export const DEFAULT_HABITS: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Вода', icon: '💧', type: 'scale', category: 'health', frequency: DAILY_FREQUENCY, target: 8, isActive: true, order: 0 },
  { name: 'Спорт', icon: '🏃', type: 'binary', category: 'health', frequency: { type: 'weekly_times', timesPerWeek: 3 }, isActive: true, order: 1 },
  { name: 'Чтение', icon: '📖', type: 'binary', category: 'growth', frequency: DAILY_FREQUENCY, isActive: true, order: 2 },
  { name: 'Сон', icon: '😴', type: 'scale', category: 'health', frequency: DAILY_FREQUENCY, target: 10, isActive: true, order: 3 },
  { name: 'Медитация', icon: '🧘', type: 'binary', category: 'health', frequency: DAILY_FREQUENCY, isActive: true, order: 4 },
  { name: 'Без соцсетей', icon: '📵', type: 'binary', category: 'productivity', frequency: DAILY_FREQUENCY, isActive: true, order: 5 },
  { name: 'Здоровая еда', icon: '🥗', type: 'binary', category: 'health', frequency: DAILY_FREQUENCY, isActive: true, order: 6 },
];

// Insight types
export interface TrendInsight {
  type: 'trend';
  metric: 'mood' | 'energy';
  period: 7 | 30;
  average: number;
  change: number; // percentage change from previous period
  direction: 'up' | 'down' | 'stable';
}

export interface CorrelationInsight {
  type: 'correlation';
  habitId: string;
  habitName: string;
  metric: 'mood' | 'energy';
  correlation: number; // Pearson coefficient (-1 to 1)
  impact: string; // Human-readable impact description (associative, not causal)
  confidence: 'low' | 'medium' | 'high'; // how much data backs this finding
  sampleWith: number; // days the habit was done (and metric present, not confounded)
  sampleWithout: number; // days the habit was scheduled but not done
  avgWith: number; // average metric on "done" days
  avgWithout: number; // average metric on "not done" days
}

export interface ComparisonInsight {
  type: 'comparison';
  metric: 'mood' | 'energy';
  currentPeriod: { average: number; label: string };
  previousPeriod: { average: number; label: string };
  change: number;
}

export interface TextInsight {
  type: 'text';
  category: 'positive' | 'negative' | 'neutral';
  message: string;
}

export type Insight = TrendInsight | CorrelationInsight | ComparisonInsight | TextInsight;
