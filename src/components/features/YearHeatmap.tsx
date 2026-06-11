import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getDateId, getDayEntries } from '@/lib/db';
import { getMoodColor, getEnergyColor, cn } from '@/lib/utils';
import { isHabitScheduledOnDate, isHabitCompleted } from '@/lib/habitSchedule';
import type { DayEntry, Habit } from '@/types';

type Metric = 'mood' | 'energy' | { habitId: string };

const WEEKDAY_LABELS = ['Пн', '', 'Ср', '', 'Пт', '', 'Вс'];
const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function startOfMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function isHabitDone(habit: Habit, entry: DayEntry | undefined): boolean {
  const progress = entry?.habits.find((h) => h.habitId === habit.id);
  return isHabitCompleted(habit, progress?.value ?? 0);
}

export function YearHeatmap() {
  const [metric, setMetric] = useState<Metric>('mood');

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // 53 weeks back, aligned to Monday so columns are whole weeks
  const gridStart = useMemo(() => {
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    return startOfMonday(start);
  }, [today]);

  const entries = useLiveQuery(() => getDayEntries(gridStart, today), [gridStart.getTime(), today.getTime()]);
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), []);

  const entriesMap = useMemo(() => {
    const map = new Map<string, DayEntry>();
    entries?.forEach((e) => map.set(e.id, e));
    return map;
  }, [entries]);

  const selectedHabit = useMemo(() => {
    if (typeof metric === 'object') return habits?.find((h) => h.id === metric.habitId) ?? null;
    return null;
  }, [metric, habits]);

  // Build week columns (each = 7 days starting Monday)
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    const cursor = new Date(gridStart);
    while (cursor <= today) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      result.push(week);
    }
    return result;
  }, [gridStart, today]);

  const cellColor = (date: Date): { background: string; opacity?: number } => {
    if (date > today) return { background: 'transparent' };
    const entry = entriesMap.get(getDateId(date));

    if (metric === 'mood') {
      if (!entry?.mood) return { background: 'var(--color-surface)' };
      return { background: getMoodColor(entry.mood) };
    }
    if (metric === 'energy') {
      if (!entry?.energy) return { background: 'var(--color-surface)' };
      return { background: getEnergyColor(entry.energy) };
    }
    // per-habit
    if (!selectedHabit) return { background: 'var(--color-surface)' };
    if (!isHabitScheduledOnDate(selectedHabit, date)) return { background: 'transparent' };
    return isHabitDone(selectedHabit, entry)
      ? { background: 'var(--color-primary)' }
      : { background: 'var(--color-surface)' };
  };

  // Month labels positioned above the first week that starts a new month
  const monthLabels = useMemo(() => {
    const labels: Array<{ index: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((week, index) => {
      const firstOfWeek = week[0];
      const month = firstOfWeek.getMonth();
      if (month !== lastMonth) {
        labels.push({ index, label: MONTHS[month] });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  const metricValue = typeof metric === 'object' ? metric.habitId : metric;
  const filledCount = useMemo(() => {
    if (metric === 'mood') return entries?.filter((e) => e.mood !== null).length ?? 0;
    if (metric === 'energy') return entries?.filter((e) => e.energy !== null).length ?? 0;
    if (selectedHabit) {
      return entries?.filter((e) => isHabitDone(selectedHabit, e)).length ?? 0;
    }
    return 0;
  }, [entries, metric, selectedHabit]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-text">Год в пикселях</div>
          <div className="text-xs text-text-muted">Последние 12 месяцев · отмечено дней: {filledCount}</div>
        </div>
        <select
          value={metricValue}
          onChange={(event) => {
            const v = event.target.value;
            setMetric(v === 'mood' || v === 'energy' ? v : { habitId: v });
          }}
          className="px-3 py-1.5 bg-transparent border border-border rounded-xl text-text text-sm"
        >
          <option value="mood">Настроение</option>
          <option value="energy">Энергия</option>
          {(habits ?? [])
            .filter((h) => h.type !== 'goal')
            .map((h) => (
              <option key={h.id} value={h.id}>
                {h.icon} {h.name}
              </option>
            ))}
        </select>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1 min-w-max">
          {/* Month labels */}
          <div className="flex gap-[3px] pl-7">
            {weeks.map((_, index) => {
              const label = monthLabels.find((m) => m.index === index);
              return (
                <div key={index} className="w-[11px] text-[9px] text-text-dim relative">
                  {label && <span className="absolute -top-0.5 left-0 whitespace-nowrap">{label.label}</span>}
                </div>
              );
            })}
          </div>

          {/* Rows: weekday label + cells */}
          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] pr-1 w-6 shrink-0">
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={i} className="h-[11px] text-[9px] text-text-dim leading-[11px] text-right">
                  {label}
                </div>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((date, di) => {
                    const color = cellColor(date);
                    const isFuture = date > today;
                    return (
                      <div
                        key={di}
                        title={isFuture ? '' : date.toLocaleDateString('ru-RU')}
                        className={cn('w-[11px] h-[11px] rounded-[2px]')}
                        style={{ backgroundColor: color.background }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
