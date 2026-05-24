import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent } from '@/components/ui';
import { HabitModal } from '@/components/features/HabitModal';
import { db, getEntriesForAnalytics } from '@/lib/db';
import { calculateHabitStats, calculateOverallStats, type HabitStats } from '@/lib/habitStats';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks';
import type { Habit } from '@/types';
import { getHabitCategoryMeta } from '@/types';

// Mini graph for last 7 days
function MiniGraph({ days }: { days: boolean[] }) {
  return (
    <div className="flex gap-0.5">
      {days.map((completed, i) => (
        <div
          key={i}
          className={cn(
            'w-2 h-4 rounded-sm transition-colors',
            completed ? 'bg-primary' : 'bg-surface'
          )}
        />
      ))}
    </div>
  );
}

// Habit card with stats
function HabitListCard({
  habit,
  stats,
  onClick,
}: {
  habit: Habit;
  stats: HabitStats | undefined;
  onClick: () => void;
}) {
  const isGoal = habit.type === 'goal';
  const goalProgress = isGoal && habit.goalTarget !== undefined && habit.goalCurrent !== undefined
    ? Math.round((habit.goalCurrent / habit.goalTarget) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left glass rounded-xl p-4 hover:glass-hover transition-all touch-feedback"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{habit.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-text font-medium truncate">{habit.name}</span>
            {!habit.isActive && (
              <span className="text-xs text-text-dim px-1.5 py-0.5 bg-surface rounded">
                Архив
              </span>
            )}
          </div>

          {isGoal ? (
            <div className="mt-1">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>{habit.goalCurrent ?? 0} / {habit.goalTarget} {habit.goalUnit}</span>
                <span>{goalProgress}%</span>
              </div>
              <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>
          ) : stats ? (
            <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
              <span>🔥 {stats.currentStreak}д</span>
              <span>📊 {stats.completionRate}%</span>
              <MiniGraph days={stats.last7Days} />
            </div>
          ) : (
            <span className="text-xs text-text-dim">Загрузка...</span>
          )}
        </div>

        {stats && !isGoal && (
          <div className="text-right">
            <div className="text-lg font-bold text-primary">{stats.currentStreak}</div>
            <div className="text-xs text-text-muted">дней</div>
          </div>
        )}
      </div>
    </button>
  );
}

// Dashboard card
function DashboardCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: string;
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <Card className="flex-1">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          <span>{icon}</span>
          <span className="text-xs text-text-muted">{label}</span>
        </div>
        <div className="text-xl font-bold text-text">{value}</div>
        {subValue && <div className="text-xs text-text-dim">{subValue}</div>}
      </CardContent>
    </Card>
  );
}

// Goal progress card
function GoalCard({
  habit,
  progress,
  onClick,
}: {
  habit: Habit;
  progress: number;
  onClick: () => void;
}) {
  const deadline = habit.goalDeadline ? new Date(habit.goalDeadline) : null;
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left glass rounded-xl p-3 hover:glass-hover transition-all touch-feedback"
    >
      <div className="flex items-center gap-2 mb-2">
        <span>{habit.icon}</span>
        <span className="text-sm text-text truncate flex-1">{habit.name}</span>
        <span className="text-sm font-medium text-primary">{progress}%</span>
      </div>
      <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {daysLeft !== null && (
        <div className="text-xs text-text-dim">
          {daysLeft > 0 ? `${daysLeft} дней осталось` : 'Срок истёк'}
        </div>
      )}
    </button>
  );
}

export function Habits() {
  usePageTitle('Привычки — управление и статистика');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchiveCleanup, setConfirmArchiveCleanup] = useState(false);

  // Fetch all habits
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), []);
  const entries = useLiveQuery(() => getEntriesForAnalytics(90), []);

  // Calculate stats for all habits
  const habitStats = useMemo(() => {
    if (!habits || !entries) return new Map<string, HabitStats>();

    const stats = new Map<string, HabitStats>();
    for (const habit of habits) {
      if (habit.type !== 'goal') {
        stats.set(habit.id, calculateHabitStats(habit, entries));
      }
    }
    return stats;
  }, [habits, entries]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (!habits || !entries) return null;
    return calculateOverallStats(habits.filter(h => h.isActive), entries);
  }, [habits, entries]);

  // Group habits by category
  const habitsByCategory = useMemo(() => {
    if (!habits) return new Map<string, Habit[]>();

    const filtered = showArchived
      ? habits.filter((habit) => !habit.isActive)
      : habits.filter((habit) => habit.isActive);
    const grouped = new Map<string, Habit[]>();

    for (const habit of filtered) {
      const category = habit.category || 'other';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(habit);
    }

    return grouped;
  }, [habits, showArchived]);

  const handleAddHabit = () => {
    setEditingHabit(null);
    setModalOpen(true);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };

  const clearArchive = async () => {
    const archived = (habits ?? []).filter((habit) => !habit.isActive);
    if (!archived.length) return;

    if (!confirmArchiveCleanup) {
      setConfirmArchiveCleanup(true);
      return;
    }

    await db.habits.bulkDelete(archived.map((habit) => habit.id));
    setConfirmArchiveCleanup(false);
  };

  const isLoading = habits === undefined || entries === undefined;

  if (isLoading) {
    return (
      <div className="flex-1 pb-24 lg:pb-8 px-4 lg:px-6 pt-6 lg:pt-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-center h-64">
          <p className="text-text-muted">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-24 lg:pb-8 px-4 lg:px-6 pt-6 lg:pt-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Привычки</h1>
          <p className="text-text-muted text-sm">Управление и статистика</p>
        </div>
        <button
          onClick={handleAddHabit}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors touch-feedback"
          aria-label="Добавить привычку"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </header>

      {/* Dashboard */}
      {overallStats && (
        <section className="mb-6">
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <DashboardCard
              icon="📊"
              label="За неделю"
              value={`${overallStats.weeklyCompletionRate}%`}
              subValue="выполнено"
            />
            {overallStats.bestHabit && (
              <DashboardCard
                icon={overallStats.bestHabit.habit.icon}
                label="Лучшая"
                value={`${overallStats.bestHabit.rate}%`}
                subValue={overallStats.bestHabit.habit.name}
              />
            )}
          </div>

          {/* Active Goals */}
          {overallStats.activeGoals.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text-muted">Активные цели</h3>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                {overallStats.activeGoals.slice(0, 4).map(({ habit, progress }) => (
                  <GoalCard
                    key={habit.id}
                    habit={habit}
                    progress={progress}
                    onClick={() => handleEditHabit(habit)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Filter */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text">Все привычки</h2>
        <div className="flex items-center gap-2">
          {showArchived && (habits ?? []).some((habit) => !habit.isActive) && (
            <button
              onClick={clearArchive}
              className={cn(
                'text-xs px-2 py-1 rounded-full transition-colors',
                confirmArchiveCleanup
                  ? 'bg-red-500 text-white'
                  : 'text-red-400 hover:bg-red-500/10'
              )}
            >
              {confirmArchiveCleanup ? 'Подтвердить очистку архива' : 'Очистить архив'}
            </button>
          )}
          <button
            onClick={() => {
              setShowArchived(!showArchived);
              setConfirmArchiveCleanup(false);
            }}
            className={cn(
              'text-xs px-2 py-1 rounded-full transition-colors',
              showArchived ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text'
            )}
          >
            {showArchived ? 'Скрыть архив' : 'Показать архив'}
          </button>
        </div>
      </div>

      {/* Habits by Category */}
      <div className="grid xl:grid-cols-2 gap-6">
        {Array.from(habitsByCategory.entries()).map(([category, categoryHabits]) => {
          const categoryInfo = getHabitCategoryMeta(category);
          return (
            <section key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span>{categoryInfo.icon}</span>
                <h3 className="text-sm font-medium text-text-muted">{categoryInfo.label}</h3>
                <span className="text-xs text-text-dim">({categoryHabits.length})</span>
              </div>
              <div className="space-y-2">
                {categoryHabits.map(habit => (
                  <HabitListCard
                    key={habit.id}
                    habit={habit}
                    stats={habitStats.get(habit.id)}
                    onClick={() => handleEditHabit(habit)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Empty state */}
      {habitsByCategory.size === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-4">🎯</p>
            <p className="text-text font-medium mb-2">Нет привычек</p>
            <p className="text-text-muted text-sm mb-4">
              Добавьте свою первую привычку
            </p>
            <button
              onClick={handleAddHabit}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
            >
              Добавить привычку
            </button>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <HabitModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        habit={editingHabit}
      />
    </div>
  );
}
