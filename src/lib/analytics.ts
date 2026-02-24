import type {
  DayEntry,
  Habit,
  Insight,
  TrendInsight,
  CorrelationInsight,
  ComparisonInsight,
  TextInsight,
} from '@/types';
import { round, percentageChange } from './utils';

// Calculate moving average
export function movingAverage(values: number[], window: number): number {
  if (values.length === 0) return 0;
  const validValues = values.filter((v) => v !== null && !isNaN(v));
  if (validValues.length === 0) return 0;

  const windowValues = validValues.slice(-window);
  const sum = windowValues.reduce((acc, val) => acc + val, 0);
  return round(sum / windowValues.length);
}

// Calculate Pearson correlation coefficient
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return round(numerator / denominator, 2);
}

// Extract mood values from entries
function extractMoods(entries: DayEntry[]): number[] {
  return entries
    .filter((e) => e.mood !== null)
    .map((e) => e.mood as number);
}

// Extract energy values from entries
function extractEnergies(entries: DayEntry[]): number[] {
  return entries
    .filter((e) => e.energy !== null)
    .map((e) => e.energy as number);
}

// Extract habit completion for specific habit
function extractHabitValues(entries: DayEntry[], habitId: string): number[] {
  return entries.map((entry) => {
    const progress = entry.habits.find((h) => h.habitId === habitId);
    return progress ? progress.value : 0;
  });
}

// Calculate trend insight
export function calculateTrend(
  entries: DayEntry[],
  metric: 'mood' | 'energy',
  period: 7 | 30
): TrendInsight | null {
  const values = metric === 'mood' ? extractMoods(entries) : extractEnergies(entries);

  if (values.length < period / 2) return null;

  const currentAvg = movingAverage(values, period);
  const previousValues = values.slice(0, -period);
  const previousAvg =
    previousValues.length > 0 ? movingAverage(previousValues, period) : currentAvg;

  const change = percentageChange(currentAvg, previousAvg);

  return {
    type: 'trend',
    metric,
    period,
    average: currentAvg,
    change: round(change),
    direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
  };
}

// Calculate correlation between habit and metric
export function calculateCorrelation(
  entries: DayEntry[],
  habit: Habit,
  metric: 'mood' | 'energy'
): CorrelationInsight | null {
  // Filter entries that have both the habit tracked and the metric
  const validEntries = entries.filter(
    (e) =>
      (metric === 'mood' ? e.mood !== null : e.energy !== null) &&
      e.habits.some((h) => h.habitId === habit.id)
  );

  if (validEntries.length < 7) return null;

  const habitValues = extractHabitValues(validEntries, habit.id);
  const metricValues =
    metric === 'mood' ? extractMoods(validEntries) : extractEnergies(validEntries);

  // For binary habits, convert to 0/1
  const normalizedHabitValues =
    habit.type === 'binary'
      ? habitValues.map((v) => (v > 0 ? 1 : 0))
      : habitValues;

  const correlation = pearsonCorrelation(normalizedHabitValues, metricValues);

  // Only report if correlation is meaningful
  if (Math.abs(correlation) < 0.3) return null;

  const metricLabel = metric === 'mood' ? 'настроение' : 'энергия';
  const impact =
    correlation > 0.5
      ? `Сильно улучшает ${metricLabel}`
      : correlation > 0.3
      ? `Улучшает ${metricLabel}`
      : correlation < -0.5
      ? `Сильно ухудшает ${metricLabel}`
      : `Ухудшает ${metricLabel}`;

  return {
    type: 'correlation',
    habitId: habit.id,
    habitName: habit.name,
    metric,
    correlation,
    impact,
  };
}

// Calculate period comparison
export function calculateComparison(
  currentEntries: DayEntry[],
  previousEntries: DayEntry[],
  metric: 'mood' | 'energy',
  currentLabel: string,
  previousLabel: string
): ComparisonInsight | null {
  const currentValues =
    metric === 'mood' ? extractMoods(currentEntries) : extractEnergies(currentEntries);
  const previousValues =
    metric === 'mood'
      ? extractMoods(previousEntries)
      : extractEnergies(previousEntries);

  if (currentValues.length < 3 || previousValues.length < 3) return null;

  const currentAvg = movingAverage(currentValues, currentValues.length);
  const previousAvg = movingAverage(previousValues, previousValues.length);
  const change = percentageChange(currentAvg, previousAvg);

  return {
    type: 'comparison',
    metric,
    currentPeriod: { average: currentAvg, label: currentLabel },
    previousPeriod: { average: previousAvg, label: previousLabel },
    change: round(change),
  };
}

// Generate text insights based on data patterns
export function generateTextInsights(
  entries: DayEntry[],
  habits: Habit[]
): TextInsight[] {
  const insights: TextInsight[] = [];

  if (entries.length < 7) {
    insights.push({
      type: 'text',
      category: 'neutral',
      message: 'Продолжайте трекать! Для инсайтов нужно минимум 7 дней данных.',
    });
    return insights;
  }

  // Check for consecutive days without a specific habit
  for (const habit of habits) {
    if (!habit.isActive || habit.type !== 'binary') continue;

    let consecutiveSkips = 0;
    const recentEntries = entries.slice(-14);

    for (let i = recentEntries.length - 1; i >= 0; i--) {
      const progress = recentEntries[i].habits.find((h) => h.habitId === habit.id);
      if (!progress || progress.value === 0) {
        consecutiveSkips++;
      } else {
        break;
      }
    }

    if (consecutiveSkips >= 3) {
      // Check if mood/energy dropped
      const recentMoods = extractMoods(recentEntries.slice(-consecutiveSkips));
      const previousMoods = extractMoods(
        recentEntries.slice(-consecutiveSkips * 2, -consecutiveSkips)
      );

      if (recentMoods.length > 0 && previousMoods.length > 0) {
        const recentAvg = movingAverage(recentMoods, recentMoods.length);
        const previousAvg = movingAverage(previousMoods, previousMoods.length);

        if (previousAvg - recentAvg > 0.5) {
          insights.push({
            type: 'text',
            category: 'negative',
            message: `Настроение снизилось после ${consecutiveSkips} дней без "${habit.name}"`,
          });
        }
      }
    }
  }

  // Check for positive patterns
  const goodMoodDays = entries.filter((e) => e.mood && e.mood >= 4);
  if (goodMoodDays.length > 0) {
    // Find most common habits on good mood days
    const habitCounts: Record<string, number> = {};

    for (const day of goodMoodDays) {
      for (const progress of day.habits) {
        if (progress.value > 0) {
          habitCounts[progress.habitId] = (habitCounts[progress.habitId] || 0) + 1;
        }
      }
    }

    const sortedHabits = Object.entries(habitCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 1);

    if (sortedHabits.length > 0) {
      const [habitId, count] = sortedHabits[0];
      const habit = habits.find((h) => h.id === habitId);
      const percentage = round((count / goodMoodDays.length) * 100, 0);

      if (habit && percentage >= 70) {
        insights.push({
          type: 'text',
          category: 'positive',
          message: `В ${percentage}% дней с хорошим настроением вы выполняли "${habit.name}"`,
        });
      }
    }
  }

  // Weekly streak check
  const lastWeek = entries.slice(-7);
  const completedDays = lastWeek.filter(
    (e) => e.mood !== null && e.habits.length > 0
  ).length;

  if (completedDays === 7) {
    insights.push({
      type: 'text',
      category: 'positive',
      message: 'Отличная неделя! Вы трекали каждый день.',
    });
  } else if (completedDays >= 5) {
    insights.push({
      type: 'text',
      category: 'positive',
      message: `Хорошая неделя! ${completedDays} из 7 дней отмечено.`,
    });
  }

  return insights;
}

// Main function to generate all insights
export async function generateInsights(
  entries: DayEntry[],
  habits: Habit[]
): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Sort entries by date
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Trends
  const moodTrend7 = calculateTrend(sortedEntries, 'mood', 7);
  if (moodTrend7) insights.push(moodTrend7);

  const energyTrend7 = calculateTrend(sortedEntries, 'energy', 7);
  if (energyTrend7) insights.push(energyTrend7);

  const moodTrend30 = calculateTrend(sortedEntries, 'mood', 30);
  if (moodTrend30) insights.push(moodTrend30);

  // Correlations
  for (const habit of habits.filter((h) => h.isActive)) {
    const moodCorrelation = calculateCorrelation(sortedEntries, habit, 'mood');
    if (moodCorrelation) insights.push(moodCorrelation);

    const energyCorrelation = calculateCorrelation(sortedEntries, habit, 'energy');
    if (energyCorrelation) insights.push(energyCorrelation);
  }

  // Period comparisons
  const now = new Date();
  const thisMonth = sortedEntries.filter((e) => {
    const date = new Date(e.date);
    return (
      date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    );
  });

  const lastMonth = sortedEntries.filter((e) => {
    const date = new Date(e.date);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    return (
      date.getMonth() === lastMonthDate.getMonth() &&
      date.getFullYear() === lastMonthDate.getFullYear()
    );
  });

  const moodComparison = calculateComparison(
    thisMonth,
    lastMonth,
    'mood',
    'Этот месяц',
    'Прошлый месяц'
  );
  if (moodComparison) insights.push(moodComparison);

  const energyComparison = calculateComparison(
    thisMonth,
    lastMonth,
    'energy',
    'Этот месяц',
    'Прошлый месяц'
  );
  if (energyComparison) insights.push(energyComparison);

  // Text insights
  const textInsights = generateTextInsights(sortedEntries, habits);
  insights.push(...textInsights);

  return insights;
}
