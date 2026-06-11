import { useState, useEffect } from 'react';
import { db, createHabit, updateHabit, deleteHabit } from '@/lib/db';
import { cn } from '@/lib/utils';
import type {
  Habit,
  HabitType,
  HabitCategory,
  HabitFrequency,
  FrequencyType,
  HabitPolarity,
  Weekday,
  BuiltinHabitCategory,
} from '@/types';
import { HABIT_CATEGORIES, WEEKDAY_LABELS } from '@/types';

const HABIT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#8b5cf6', '#64748b'];

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit | null; // null = create new
}

const HABIT_ICONS = ['💧', '🏃', '📖', '😴', '🧘', '📵', '🥗', '💪', '🚶', '🎯', '📝', '🧠', '💰', '🎨', '🎵', '🌱', '☕', '🍎', '⏰', '🔥'];
const BUILTIN_CATEGORY_KEYS = Object.keys(HABIT_CATEGORIES) as BuiltinHabitCategory[];

export function HabitModal({ isOpen, onClose, habit }: HabitModalProps) {
  const isEditing = !!habit;

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [type, setType] = useState<HabitType>('binary');
  const [category, setCategory] = useState<HabitCategory>('health');
  const [target, setTarget] = useState(1);
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [weeklyDays, setWeeklyDays] = useState<Weekday[]>([0, 2, 4]); // Mon, Wed, Fri
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [intervalDays, setIntervalDays] = useState(3);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [polarity, setPolarity] = useState<HabitPolarity>('positive');
  const [limit, setLimit] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  // Goal fields
  const [goalTarget, setGoalTarget] = useState(12);
  const [goalCurrent, setGoalCurrent] = useState(0);
  const [goalUnit, setGoalUnit] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens/closes or habit changes
  useEffect(() => {
    if (isOpen) {
      if (habit) {
        setName(habit.name);
        setIcon(habit.icon);
        setType(habit.type);
        setCategory(habit.category || 'other');
        setTarget(habit.target ?? 1);
        setFrequencyType(habit.frequency?.type ?? 'daily');
        setWeeklyDays(habit.frequency?.weeklyDays ?? [0, 2, 4]);
        setTimesPerWeek(habit.frequency?.timesPerWeek ?? 3);
        setIntervalDays(habit.frequency?.intervalDays ?? 3);
        setColor(habit.color);
        setPolarity(habit.polarity ?? 'positive');
        setLimit(habit.limit ?? 0);
        setIsActive(habit.isActive);
        setGoalTarget(habit.goalTarget ?? 12);
        setGoalCurrent(habit.goalCurrent ?? 0);
        setGoalUnit(habit.goalUnit ?? '');
        setGoalDeadline(habit.goalDeadline ? new Date(habit.goalDeadline).toISOString().split('T')[0] : '');
      } else {
        // Reset to defaults for new habit
        setName('');
        setIcon('🎯');
        setType('binary');
        setCategory('health');
        setTarget(1);
        setFrequencyType('daily');
        setWeeklyDays([0, 2, 4]);
        setTimesPerWeek(3);
        setIntervalDays(3);
        setColor(undefined);
        setPolarity('positive');
        setLimit(0);
        setIsActive(true);
        setGoalTarget(12);
        setGoalCurrent(0);
        setGoalUnit('');
        setGoalDeadline('');
      }
      setIsDeleting(false);
    }
  }, [isOpen, habit]);

  useEffect(() => {
    if (!isOpen) return;

    const loadCustomCategories = async () => {
      const habits = await db.habits.toArray();
      const categories = Array.from(
        new Set(
          habits
            .map((item) => item.category.trim())
            .filter((item) => item.length > 0 && !BUILTIN_CATEGORY_KEYS.includes(item as BuiltinHabitCategory))
        )
      );
      setCustomCategories(categories);
    };

    loadCustomCategories();
    setNewCategory('');
  }, [isOpen]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);

    const frequency: HabitFrequency = {
      type: frequencyType,
      ...(frequencyType === 'weekly_days' && { weeklyDays }),
      ...(frequencyType === 'weekly_times' && { timesPerWeek }),
      ...(frequencyType === 'interval' && { intervalDays: Math.max(1, intervalDays) }),
    };

    const isLimit = polarity === 'limit' && type !== 'goal';

    const habitData = {
      name: name.trim(),
      icon,
      color: color || undefined,
      type,
      category,
      target: type === 'scale' ? target : undefined,
      polarity: isLimit ? ('limit' as const) : undefined,
      limit: isLimit ? Math.max(0, limit) : undefined,
      frequency,
      isActive,
      ...(type === 'goal' && {
        goalTarget,
        goalCurrent,
        goalUnit: goalUnit.trim() || undefined,
        goalDeadline: goalDeadline ? new Date(goalDeadline) : undefined,
      }),
    };

    try {
      if (isEditing) {
        await updateHabit(habit.id, habitData);
      } else {
        const existingHabits = await db.habits.count();
        await createHabit({
          ...habitData,
          order: existingHabits,
        });
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!habit) return;

    if (habit.isActive) {
      await updateHabit(habit.id, { isActive: false });
      onClose();
      return;
    }

    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }

    await deleteHabit(habit.id);
    onClose();
  };

  const handleRestore = async () => {
    if (!habit) return;
    await updateHabit(habit.id, { isActive: true });
    onClose();
  };

  const handleAddCustomCategory = () => {
    const value = newCategory.trim();
    if (!value) return;

    if (!customCategories.includes(value)) {
      setCustomCategories((prev) => [...prev, value]);
    }
    setCategory(value);
    setNewCategory('');
  };

  const toggleWeekday = (day: Weekday) => {
    if (weeklyDays.includes(day)) {
      setWeeklyDays(weeklyDays.filter(d => d !== day));
    } else {
      setWeeklyDays([...weeklyDays, day].sort((a, b) => a - b));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface rounded-t-3xl sm:rounded-3xl border border-border shadow-xl animate-slide-up">
        {/* Header */}
        <div className="rounded-t-3xl sm:rounded-3xl glass border-b border-border px-4 py-4 flex items-center justify-between z-20 m-1">
          <h2 className="text-lg font-semibold text-text">
            {isEditing ? 'Редактировать' : 'Новая привычка'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text"
            aria-label="Закрыть"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Icon picker */}
          <div>
            <label className="block text-sm text-text-muted mb-2">Иконка</label>
            <div className="flex flex-wrap gap-2">
              {HABIT_ICONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all',
                    icon === emoji
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'glass hover:glass-hover'
                  )}
                >
                  {emoji}
                </button>
              ))}
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value.slice(0, 2) || '🎯')}
                aria-label="Свой эмодзи"
                className="w-10 h-10 rounded-xl text-xl text-center bg-transparent border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                title="Свой эмодзи"
              />
            </div>
          </div>

          {/* Color accent */}
          <div>
            <label className="block text-sm text-text-muted mb-2">Цвет</label>
            <div className="flex flex-wrap gap-2 items-center">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Цвет ${c}`}
                  aria-pressed={color === c}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-white' : ''
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                type="button"
                onClick={() => setColor(undefined)}
                className={cn(
                  'px-3 h-8 rounded-full text-xs transition-all',
                  color === undefined ? 'bg-primary/20 ring-1 ring-primary text-primary' : 'glass text-text-muted'
                )}
              >
                Без цвета
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-text-muted mb-2">Название</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Например: Утренняя зарядка"
              className="w-full px-4 py-3 bg-transparent border border-border rounded-xl text-text placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm text-text-muted mb-2">Тип</label>
            <div className="flex gap-2">
              {[
                { value: 'binary', label: 'Да/Нет', desc: 'Выполнено или нет' },
                { value: 'scale', label: 'Счётчик', desc: 'С целью (8 стаканов)' },
                { value: 'goal', label: 'Цель', desc: 'Долгосрочная цель' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value as HabitType)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-xl text-sm transition-all',
                    type === option.value
                      ? 'bg-primary/20 ring-1 ring-primary text-primary'
                      : 'glass hover:glass-hover text-text-muted'
                  )}
                >
                  <div className="font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Scale target */}
          {type === 'scale' && (
            <div>
              <label className="block text-sm text-text-muted mb-2">Цель за день</label>
              <input
                type="number"
                value={target}
                onChange={e => setTarget(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-full px-4 py-3 bg-transparent border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}

          {/* Limit / quit habit */}
          {type !== 'goal' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 glass rounded-xl">
                <div>
                  <div className="text-text font-medium">Привычка-ограничитель</div>
                  <div className="text-xs text-text-muted">Цель — не превышать лимит или бросить</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPolarity(polarity === 'limit' ? 'positive' : 'limit')}
                  aria-pressed={polarity === 'limit'}
                  className={cn(
                    'w-12 h-7 rounded-full transition-colors relative shrink-0',
                    polarity === 'limit' ? 'bg-primary' : 'bg-surface'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-1 w-5 h-5 rounded-full bg-white transition-transform',
                      polarity === 'limit' ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
              {polarity === 'limit' && (
                <div>
                  <label className="block text-sm text-text-muted mb-2">Лимит в день (0 = совсем бросить)</label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    className="w-full px-4 py-3 bg-transparent border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              )}
            </div>
          )}

          {/* Goal fields */}
          {type === 'goal' && (
            <div className="space-y-4 p-4 glass rounded-xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-2">Цель</label>
                  <input
                    type="number"
                    value={goalTarget}
                    onChange={e => setGoalTarget(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    className="w-full px-3 py-2 bg-transparent border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-2">Текущий</label>
                  <input
                    type="number"
                    value={goalCurrent}
                    onChange={e => setGoalCurrent(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    className="w-full px-3 py-2 bg-transparent border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">Единица (необязательно)</label>
                <input
                  type="text"
                  value={goalUnit}
                  onChange={e => setGoalUnit(e.target.value)}
                  placeholder="книг, км, часов..."
                  className="w-full px-3 py-2 bg-transparent border border-border rounded-xl text-text placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-2">Дедлайн (необязательно)</label>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={e => setGoalDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm text-text-muted mb-2">Категория</label>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(Object.entries(HABIT_CATEGORIES) as [BuiltinHabitCategory, { label: string; icon: string }][]).map(
                  ([key, { label, icon: catIcon }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all',
                        category === key
                          ? 'bg-primary/20 ring-1 ring-primary text-primary'
                          : 'glass hover:glass-hover text-text-muted'
                      )}
                    >
                      <span>{catIcon}</span>
                      <span>{label}</span>
                    </button>
                  )
                )}
                {customCategories.map((customCategory) => (
                  <button
                    key={customCategory}
                    type="button"
                    onClick={() => setCategory(customCategory)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all',
                      category === customCategory
                        ? 'bg-primary/20 ring-1 ring-primary text-primary'
                        : 'glass hover:glass-hover text-text-muted'
                    )}
                  >
                    <span>🏷️</span>
                    <span>{customCategory}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  placeholder="Новая категория"
                  className="flex-1 px-3 py-2 bg-transparent border border-border rounded-xl text-text placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  disabled={!newCategory.trim()}
                  className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>

          {/* Frequency (not for goals) */}
          {type !== 'goal' && (
            <div>
              <label className="block text-sm text-text-muted mb-2">Периодичность</label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'daily', label: 'Каждый день' },
                    { value: 'weekly_days', label: 'По дням' },
                    { value: 'weekly_times', label: 'Раз в неделю' },
                    { value: 'interval', label: 'Каждые N дней' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFrequencyType(option.value as FrequencyType)}
                      className={cn(
                        'px-3 py-2 rounded-xl text-sm transition-all',
                        frequencyType === option.value
                          ? 'bg-primary/20 ring-1 ring-primary text-primary'
                          : 'glass hover:glass-hover text-text-muted'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Interval days */}
                {frequencyType === 'interval' && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-muted">Каждые</span>
                    <input
                      type="number"
                      min={1}
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-3 py-2 bg-transparent border border-border rounded-xl text-text text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm text-text-muted">дней</span>
                  </div>
                )}

                {/* Weekly days picker */}
                {frequencyType === 'weekly_days' && (
                  <div className="flex gap-1 justify-center">
                    {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWeekday(day)}
                        className={cn(
                          'w-10 h-10 rounded-full text-sm font-medium transition-all',
                          weeklyDays.includes(day)
                            ? 'bg-primary text-white'
                            : 'glass hover:glass-hover text-text-muted'
                        )}
                      >
                        {WEEKDAY_LABELS[day].short}
                      </button>
                    ))}
                  </div>
                )}

                {/* Times per week */}
                {frequencyType === 'weekly_times' && (
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={7}
                      value={timesPerWeek}
                      onChange={e => setTimesPerWeek(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-text font-medium w-16 text-center">
                      {timesPerWeek}×/нед
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active toggle (editing only) */}
          {isEditing && (
            <div className="flex items-center justify-between p-4 glass rounded-xl">
              <div>
                <div className="text-text font-medium">Активная</div>
                <div className="text-xs text-text-muted">Показывать на главной</div>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={cn(
                  'w-12 h-7 rounded-full transition-colors relative',
                  isActive ? 'bg-primary' : 'bg-surface'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-5 h-5 rounded-full bg-white transition-transform',
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 glass border-t border-border p-4 space-y-2 z-20 m-1">
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
          </button>

          {isEditing && (
            <button
              onClick={handleDelete}
              className={cn(
                'w-full py-3 font-medium rounded-xl transition-colors',
                isDeleting
                  ? 'bg-red-500 text-white'
                  : 'text-red-400 hover:bg-red-500/10'
              )}
            >
              {habit?.isActive
                ? 'В архив'
                : isDeleting
                  ? 'Нажмите ещё раз для полного удаления'
                  : 'Удалить из архива'}
            </button>
          )}

          {isEditing && habit && !habit.isActive && (
            <button
              onClick={handleRestore}
              className="w-full py-3 font-medium rounded-xl transition-colors text-primary hover:bg-primary/10"
            >
              Восстановить из архива
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
