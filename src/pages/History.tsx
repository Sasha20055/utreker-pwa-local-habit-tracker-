import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent } from '@/components/ui';
import { YearHeatmap, DayEditor } from '@/components/features';
import { db, getMonthEntries, getDayEntries, getDateId } from '@/lib/db';
import { formatMonthYear, getCalendarDays, isToday, cn } from '@/lib/utils';
import { isHabitScheduledOnDate, isHabitCompleted } from '@/lib/habitSchedule';
import { MOOD_EMOJIS, ENERGY_EMOJIS, getHabitCategoryMeta, CONTEXT_TAG_INFO } from '@/types';
import { usePageTitle } from '@/hooks';
import type { DayEntry, Habit, ContextTag } from '@/types';

const SEARCH_TAGS: ContextTag[] = ['stress', 'illness', 'travel', 'holiday', 'busy', 'rest', 'celebration'];

type ComparisonMode = 'week' | 'month';
type GraphMetric = 'completion' | 'mood' | 'energy';

interface TrendPoint {
  date: Date;
  value: number | null;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function getAverageMood(entries: DayEntry[]): number | null {
  const moods = entries
    .map((entry) => entry.mood)
    .filter((mood): mood is 1 | 2 | 3 | 4 | 5 => mood !== null);
  if (!moods.length) return null;
  return Number((moods.reduce((sum, mood) => sum + mood, 0) / moods.length).toFixed(1));
}

function buildRangeEndingAt(endDate: Date, days: number): Date[] {
  const result: Date[] = [];
  const start = normalizeDate(new Date(endDate));
  start.setDate(start.getDate() - (days - 1));

  const current = new Date(start);
  const end = normalizeDate(endDate);
  while (current.getTime() <= end.getTime()) {
    result.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return result;
}

function getEntryCompletionRate(entry: DayEntry | undefined, date: Date, habits: Habit[]): number | null {
  const scheduledHabits = habits.filter((habit) => isHabitScheduledOnDate(habit, date));
  if (!scheduledHabits.length) return null;

  let completed = 0;
  for (const habit of scheduledHabits) {
    const progress = entry?.habits.find((item) => item.habitId === habit.id);
    const value = progress?.value ?? 0;
    if (isHabitCompleted(habit, value)) completed++;
  }

  return Math.round((completed / scheduledHabits.length) * 100);
}

function getHabitStability(habit: Habit, entriesMap: Map<string, DayEntry>, range: Date[]): number | null {
  let trackedDays = 0;
  let completedDays = 0;

  for (const date of range) {
    if (!isHabitScheduledOnDate(habit, date)) continue;
    trackedDays++;

    const entry = entriesMap.get(getDateId(date));
    const progress = entry?.habits.find((item) => item.habitId === habit.id);
    const value = progress?.value ?? 0;
    if (isHabitCompleted(habit, value)) completedDays++;
  }

  if (trackedDays === 0) return null;
  return Math.round((completedDays / trackedDays) * 100);
}

function buildSegments(
  points: Array<{ x: number; y: number; value: number | null }>
): Array<Array<{ x: number; y: number }>> {
  const segments: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> = [];

  for (const point of points) {
    if (point.value === null) {
      if (current.length > 1) segments.push(current);
      current = [];
      continue;
    }
    current.push({ x: point.x, y: point.y });
  }

  if (current.length > 1) segments.push(current);
  return segments;
}

function TrendChart({
  title,
  subtitle,
  unit,
  min,
  max,
  points,
}: {
  title: string;
  subtitle: string;
  unit: string;
  min: number;
  max: number;
  points: TrendPoint[];
}) {
  const width = 900;
  const height = 300;
  const padding = { top: 16, right: 16, bottom: 34, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const ySteps = 4;

  const visualPoints = points.map((point, index) => {
    const x = padding.left + (index / Math.max(points.length - 1, 1)) * chartWidth;
    const normalized = point.value === null ? null : (point.value - min) / Math.max(max - min, 1);
    const y = normalized === null
      ? padding.top + chartHeight
      : padding.top + (1 - normalized) * chartHeight;
    return { x, y, value: point.value };
  });

  const segments = buildSegments(visualPoints);
  const validPoints = visualPoints.filter((point) => point.value !== null);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div>
          <div className="text-sm font-semibold text-text">{title}</div>
          <div className="text-xs text-text-muted">{subtitle}</div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 lg:h-64">
          {Array.from({ length: ySteps + 1 }).map((_, step) => {
            const ratio = step / ySteps;
            const y = padding.top + ratio * chartHeight;
            const value = Math.round((max - ratio * (max - min)) * 10) / 10;
            return (
              <g key={step}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.12}
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="currentColor"
                  fillOpacity={0.55}
                  fontSize={10}
                >
                  {value}{unit}
                </text>
              </g>
            );
          })}

          {segments.map((segment, index) => {
            const path = segment
              .map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
              .join(' ');
            return (
              <path
                key={index}
                d={path}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.9}
                strokeWidth={2.5}
                className="text-primary"
              />
            );
          })}

          {validPoints.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={2.8}
              className="fill-primary"
            />
          ))}

          {points.length > 0 && (
            <>
              <text x={padding.left} y={height - 8} fill="currentColor" fillOpacity={0.6} fontSize={10}>
                {formatShortDate(points[0].date)}
              </text>
              <text x={width / 2} y={height - 8} textAnchor="middle" fill="currentColor" fillOpacity={0.6} fontSize={10}>
                {formatShortDate(points[Math.floor(points.length / 2)].date)}
              </text>
              <text x={width - padding.right} y={height - 8} textAnchor="end" fill="currentColor" fillOpacity={0.6} fontSize={10}>
                {formatShortDate(points[points.length - 1].date)}
              </text>
            </>
          )}
        </svg>
      </CardContent>
    </Card>
  );
}

export function History() {
  usePageTitle('История — календарь и аналитика привычек');
  const [currentDate, setCurrentDate] = useState(() => normalizeDate(new Date()));
  const [referenceDate, setReferenceDate] = useState(() => normalizeDate(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('week');
  const [graphMetric, setGraphMetric] = useState<GraphMetric>('completion');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [habitFilter, setHabitFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTags, setSearchTags] = useState<ContextTag[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const periodLength = comparisonMode === 'week' ? 7 : 30;

  const entries = useLiveQuery(() => getMonthEntries(year, month), [year, month]);
  const allEntries = useLiveQuery(
    () => getDayEntries(new Date(year, month - 6, 1), new Date(year, month + 1, 0)),
    [year, month]
  );
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), []);

  const searchActive = searchQuery.trim().length > 0 || searchTags.length > 0;
  const allDays = useLiveQuery(
    () => (searchActive ? db.days.orderBy('date').reverse().toArray() : Promise.resolve<DayEntry[]>([])),
    [searchActive]
  );

  const searchResults = useMemo(() => {
    if (!searchActive) return [];
    const q = searchQuery.trim().toLowerCase();
    return (allDays ?? []).filter((day) => {
      const matchesText = !q || (day.notes ?? '').toLowerCase().includes(q);
      const matchesTags = searchTags.every((tag) => day.tags?.includes(tag));
      return matchesText && matchesTags;
    });
  }, [allDays, searchActive, searchQuery, searchTags]);

  const entriesMap = useMemo(() => {
    const map = new Map<string, DayEntry>();
    allEntries?.forEach((entry) => map.set(entry.id, entry));
    return map;
  }, [allEntries]);

  const monthEntriesMap = useMemo(() => {
    const map = new Map<string, DayEntry>();
    entries?.forEach((entry) => map.set(entry.id, entry));
    return map;
  }, [entries]);

  const categories = useMemo(
    () => Array.from(new Set((habits ?? []).map((habit) => habit.category))).sort(),
    [habits]
  );

  const filteredHabits = useMemo(() => {
    const regular = (habits ?? []).filter((habit) => habit.type !== 'goal');
    const byCategory = categoryFilter === 'all'
      ? regular
      : regular.filter((habit) => habit.category === categoryFilter);
    return habitFilter === 'all'
      ? byCategory
      : byCategory.filter((habit) => habit.id === habitFilter);
  }, [habits, categoryFilter, habitFilter]);

  const activeGoals = useMemo(
    () => (habits ?? []).filter((habit) => habit.type === 'goal' && habit.isActive),
    [habits]
  );

  useEffect(() => {
    if (habitFilter === 'all') return;
    const exists = filteredHabits.some((habit) => habit.id === habitFilter);
    if (!exists) setHabitFilter('all');
  }, [filteredHabits, habitFilter]);

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);

  const goToPreviousMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    const today = normalizeDate(new Date());
    setCurrentDate(today);
    setReferenceDate(today);
  };

  const currentPeriodRange = useMemo(
    () => buildRangeEndingAt(referenceDate, periodLength),
    [referenceDate, periodLength]
  );
  const previousPeriodRange = useMemo(() => {
    const previousEnd = new Date(referenceDate);
    previousEnd.setDate(previousEnd.getDate() - periodLength);
    return buildRangeEndingAt(previousEnd, periodLength);
  }, [referenceDate, periodLength]);

  const selectedEntry = useMemo(() => {
    if (!selectedDate) return null;
    return entriesMap.get(getDateId(selectedDate)) ?? null;
  }, [selectedDate, entriesMap]);

  const selectedPrevEntry = useMemo(() => {
    if (!selectedDate) return null;
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    return entriesMap.get(getDateId(prev)) ?? null;
  }, [selectedDate, entriesMap]);

  const trendPoints = useMemo(() => {
    return currentPeriodRange.map((date) => {
      const entry = entriesMap.get(getDateId(date));
      if (graphMetric === 'completion') {
        return { date, value: getEntryCompletionRate(entry, date, filteredHabits) };
      }
      if (graphMetric === 'mood') {
        return { date, value: entry?.mood ?? null };
      }
      return { date, value: entry?.energy ?? null };
    });
  }, [currentPeriodRange, entriesMap, filteredHabits, graphMetric]);

  const stats = useMemo(() => {
    if (!allEntries || !habits) return null;

    const completionForRange = (range: Date[]) => {
      const values = range
        .map((date) => getEntryCompletionRate(entriesMap.get(getDateId(date)), date, filteredHabits))
        .filter((value): value is number => value !== null);
      if (!values.length) return null;
      return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    };

    const completion = completionForRange(currentPeriodRange);
    const previousCompletion = completionForRange(previousPeriodRange);
    const completionDelta =
      completion !== null && previousCompletion !== null
        ? completion - previousCompletion
        : null;

    const currentEntries = currentPeriodRange
      .map((date) => entriesMap.get(getDateId(date)))
      .filter((entry): entry is DayEntry => Boolean(entry));
    const previousEntries = previousPeriodRange
      .map((date) => entriesMap.get(getDateId(date)))
      .filter((entry): entry is DayEntry => Boolean(entry));

    const mood = getAverageMood(currentEntries);
    const previousMood = getAverageMood(previousEntries);
    const moodDelta =
      mood !== null && previousMood !== null
        ? Number((mood - previousMood).toFixed(1))
        : null;

    const stableCandidates = filteredHabits
      .map((habit) => ({
        habit,
        stability: getHabitStability(habit, entriesMap, currentPeriodRange),
      }))
      .filter((item): item is { habit: Habit; stability: number } => item.stability !== null)
      .sort((a, b) => b.stability - a.stability);

    const stableHabit = stableCandidates[0] ?? null;

    const averageGoalProgress = activeGoals.length
      ? Math.round(
          activeGoals.reduce((sum, goal) => {
            const target = goal.goalTarget ?? 1;
            const current = goal.goalCurrent ?? 0;
            return sum + (current / target) * 100;
          }, 0) / activeGoals.length
        )
      : null;

    return {
      completion,
      completionDelta,
      mood,
      moodDelta,
      stableHabit,
      averageGoalProgress,
    };
  }, [activeGoals, allEntries, currentPeriodRange, entriesMap, filteredHabits, habits, previousPeriodRange]);

  const previousLabel = comparisonMode === 'week' ? 'предыдущей неделе' : 'предыдущим 30 дням';
  const completionDelta = stats?.completionDelta;
  const moodDelta = stats?.moodDelta;
  const periodSubtitle = `${formatShortDate(currentPeriodRange[0])} - ${formatShortDate(
    currentPeriodRange[currentPeriodRange.length - 1]
  )}`;

  return (
    <div className="flex-1 pb-24 lg:pb-8 px-4 lg:px-6 pt-6 lg:pt-8 max-w-6xl mx-auto w-full space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-2 glass rounded-xl hover:glass-hover touch-feedback"
            aria-label="Предыдущий месяц"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button onClick={goToToday} className="text-xl font-bold text-text capitalize">
            {formatMonthYear(currentDate)}
          </button>

          <button
            onClick={goToNextMonth}
            className="p-2 glass rounded-xl hover:glass-hover touch-feedback"
            aria-label="Следующий месяц"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setComparisonMode('week')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm',
              comparisonMode === 'week'
                ? 'bg-primary/20 text-primary'
                : 'glass text-text-muted hover:glass-hover'
            )}
          >
            7 дней
          </button>
          <button
            type="button"
            onClick={() => setComparisonMode('month')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm',
              comparisonMode === 'month'
                ? 'bg-primary/20 text-primary'
                : 'glass text-text-muted hover:glass-hover'
            )}
          >
            30 дней
          </button>
        </div>

        <Card>
          <CardContent className="space-y-2">
            <div className="text-xs text-text-muted">Опорная дата периода</div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={formatInputDate(referenceDate)}
                onChange={(event) => {
                  const [y, m, d] = event.target.value.split('-').map(Number);
                  if (!y || !m || !d) return;
                  const next = normalizeDate(new Date(y, m - 1, d));
                  setReferenceDate(next);
                  setCurrentDate(next);
                }}
                className="flex-1 px-3 py-2 bg-transparent border border-border rounded-xl text-text"
              />
              <button
                type="button"
                onClick={() => {
                  const today = normalizeDate(new Date());
                  setReferenceDate(today);
                  setCurrentDate(today);
                }}
                className="px-3 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
              >
                Сегодня
              </button>
            </div>
            <div className="text-xs text-text-dim">Период: {periodSubtitle}</div>
          </CardContent>
        </Card>
      </header>

      <Card>
        <CardContent className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
          <div className="glass rounded-xl p-3">
            <div className="text-xs text-text-muted">% выполнения</div>
            <div className="text-xl font-bold text-text">{stats?.completion ?? '—'}%</div>
            <div className="text-xs text-text-dim">
              {completionDelta === null || completionDelta === undefined
                ? 'Недостаточно данных'
                : `${completionDelta > 0 ? '+' : ''}${completionDelta}% к ${previousLabel}`}
            </div>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="text-xs text-text-muted">Среднее настроение</div>
            <div className="text-xl font-bold text-text">{stats?.mood ?? '—'}</div>
            <div className="text-xs text-text-dim">
              {moodDelta === null || moodDelta === undefined
                ? 'Недостаточно данных'
                : `${moodDelta > 0 ? '+' : ''}${moodDelta} к ${previousLabel}`}
            </div>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="text-xs text-text-muted">Прогресс целей</div>
            <div className="text-xl font-bold text-text">{stats?.averageGoalProgress ?? '—'}%</div>
            <div className="text-xs text-text-dim">
              {activeGoals.length ? `${activeGoals.length} активных целей` : 'Нет активных целей'}
            </div>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="text-xs text-text-muted">Самая стабильная</div>
            <div className="text-sm font-semibold text-text truncate">
              {stats?.stableHabit ? `${stats.stableHabit.habit.icon} ${stats.stableHabit.habit.name}` : '—'}
            </div>
            <div className="text-xs text-text-dim">
              {stats?.stableHabit ? `${stats.stableHabit.stability}% выполнения` : 'Недостаточно данных'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setHabitFilter('all');
              }}
              className="px-3 py-2 bg-transparent border border-border rounded-xl text-text"
            >
              <option value="all">Все категории</option>
              {categories.map((category) => {
                const meta = getHabitCategoryMeta(category);
                return (
                  <option key={category} value={category}>
                    {meta.icon} {meta.label}
                  </option>
                );
              })}
            </select>

            <select
              value={habitFilter}
              onChange={(event) => setHabitFilter(event.target.value)}
              className="px-3 py-2 bg-transparent border border-border rounded-xl text-text"
            >
              <option value="all">Все привычки</option>
              {filteredHabits.map((habit) => (
                <option key={habit.id} value={habit.id}>
                  {habit.icon} {habit.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по заметкам…"
            className="w-full px-3 py-2 bg-transparent border border-border rounded-xl text-text placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex flex-wrap gap-2">
            {SEARCH_TAGS.map((tag) => {
              const active = searchTags.includes(tag);
              const info = CONTEXT_TAG_INFO[tag];
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setSearchTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )
                  }
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all',
                    active ? 'bg-primary/20 text-primary ring-1 ring-primary' : 'glass text-text-muted hover:glass-hover'
                  )}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>

          {searchActive && (
            <div className="space-y-2 pt-1">
              <div className="text-xs text-text-dim">Найдено: {searchResults.length}</div>
              {searchResults.slice(0, 50).map((day) => {
                const date = new Date(day.date);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => {
                      const normalized = normalizeDate(date);
                      setSelectedDate(normalized);
                      setCurrentDate(normalized);
                    }}
                    className="w-full text-left glass rounded-xl px-3 py-2 hover:glass-hover touch-feedback"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-text">{formatShortDate(date)}</span>
                      <span className="text-sm">
                        {day.mood ? MOOD_EMOJIS[day.mood] : ''}{day.energy ? ENERGY_EMOJIS[day.energy] : ''}
                      </span>
                    </div>
                    {day.tags?.length > 0 && (
                      <div className="text-xs text-text-dim mt-0.5">
                        {day.tags.map((t) => CONTEXT_TAG_INFO[t]?.label).join(', ')}
                      </div>
                    )}
                    {day.notes && (
                      <div className="text-xs text-text-muted truncate mt-0.5">{day.notes}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setGraphMetric('completion')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs',
            graphMetric === 'completion'
              ? 'bg-primary/20 text-primary'
              : 'glass text-text-muted hover:glass-hover'
          )}
        >
          Выполнение
        </button>
        <button
          type="button"
          onClick={() => setGraphMetric('mood')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs',
            graphMetric === 'mood'
              ? 'bg-primary/20 text-primary'
              : 'glass text-text-muted hover:glass-hover'
          )}
        >
          Настроение
        </button>
        <button
          type="button"
          onClick={() => setGraphMetric('energy')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs',
            graphMetric === 'energy'
              ? 'bg-primary/20 text-primary'
              : 'glass text-text-muted hover:glass-hover'
          )}
        >
          Энергия
        </button>
      </div>

      <TrendChart
        title={
          graphMetric === 'completion'
            ? 'Динамика выполнения привычек'
            : graphMetric === 'mood'
              ? 'Динамика настроения'
              : 'Динамика энергии'
        }
        subtitle={`${comparisonMode === 'week' ? 'Неделя' : '30 дней'} • ${periodSubtitle}`}
        unit={graphMetric === 'completion' ? '%' : ''}
        min={graphMetric === 'completion' ? 0 : 1}
        max={graphMetric === 'completion' ? 100 : 5}
        points={trendPoints}
      />

      <Card>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs text-text-muted py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} className="aspect-square lg:aspect-auto lg:h-10" />;

              const id = getDateId(date);
              const entry = monthEntriesMap.get(id);
              const rate = getEntryCompletionRate(entry, date, filteredHabits);
              const isSelected = selectedDate ? getDateId(selectedDate) === id : false;
              const isTodayDate = isToday(date);

              return (
                <button
                  key={id}
                  onClick={() => setSelectedDate(normalizeDate(date))}
                  className={cn(
                    'aspect-square rounded-xl flex flex-col items-center justify-center relative',
                    'lg:aspect-auto lg:h-10',
                    'transition-all duration-200 touch-feedback text-sm',
                    isTodayDate && 'ring-2 ring-primary',
                    isSelected && 'ring-2 ring-white/80'
                  )}
                  style={{
                    backgroundColor:
                      rate === null ? 'var(--color-surface)' : `rgba(94, 234, 212, ${Math.max(0.12, rate / 120)})`,
                  }}
                >
                  <span className={cn('font-medium', isTodayDate ? 'text-primary' : 'text-text')}>
                    {date.getDate()}
                  </span>
                  {entry?.mood && <span className="text-[10px]">{MOOD_EMOJIS[entry.mood]}</span>}
                  {!entry && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-text-dim" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <YearHeatmap />
        </CardContent>
      </Card>

      {selectedDate && (
        <Card className="animate-fade-in">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text capitalize">
                {selectedDate.toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  weekday: 'long',
                })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1 text-text-muted hover:text-text"
                aria-label="Закрыть"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedEntry && (
              <div className="grid grid-cols-2 gap-2">
                <div className="glass rounded-xl p-3">
                  <div className="text-xs text-text-muted">Выполнение за день</div>
                  <div className="text-lg font-bold text-text">
                    {getEntryCompletionRate(selectedEntry, selectedDate, filteredHabits) ?? 0}%
                  </div>
                  <div className="text-xs text-text-dim">
                    {selectedPrevEntry
                      ? `${(() => {
                          const current = getEntryCompletionRate(selectedEntry, selectedDate, filteredHabits) ?? 0;
                          const prevDate = new Date(selectedDate);
                          prevDate.setDate(prevDate.getDate() - 1);
                          const prevRate = getEntryCompletionRate(selectedPrevEntry, prevDate, filteredHabits) ?? 0;
                          const delta = current - prevRate;
                          return `${delta > 0 ? '+' : ''}${delta}% к предыдущему дню`;
                        })()}`
                      : 'Нет данных за предыдущий день'}
                  </div>
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="text-xs text-text-muted">Состояние</div>
                  <div className="text-lg font-bold text-text flex items-center gap-2">
                    {selectedEntry.mood ? MOOD_EMOJIS[selectedEntry.mood] : '—'}
                    {selectedEntry.energy ? ENERGY_EMOJIS[selectedEntry.energy] : '—'}
                  </div>
                  <div className="text-xs text-text-dim">
                    {selectedPrevEntry
                      ? `Настроение: ${(selectedEntry.mood ?? 0) - (selectedPrevEntry.mood ?? 0) >= 0 ? '+' : ''}${(selectedEntry.mood ?? 0) - (selectedPrevEntry.mood ?? 0)}`
                      : 'Нет сравнения'}
                  </div>
                </div>
              </div>
            )}

            <DayEditor date={selectedDate} habits={habits ?? []} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
