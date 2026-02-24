import { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent } from '@/components/ui';
import { useHabits } from '@/hooks';
import { getEntriesForAnalytics } from '@/lib/db';
import { generateInsights } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import type { Insight, TrendInsight, CorrelationInsight, ComparisonInsight, TextInsight } from '@/types';

// Insight card components
function TrendCard({ insight }: { insight: TrendInsight }) {
  const metricLabel = insight.metric === 'mood' ? 'Настроение' : 'Энергия';
  const periodLabel = insight.period === 7 ? 'за неделю' : 'за месяц';

  const directionIcon = {
    up: '\u2191',
    down: '\u2193',
    stable: '\u2192',
  }[insight.direction];

  const directionColor = {
    up: 'text-green-400',
    down: 'text-red-400',
    stable: 'text-yellow-400',
  }[insight.direction];

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-muted text-sm">{metricLabel} {periodLabel}</p>
            <p className="text-2xl font-bold text-text">{insight.average.toFixed(1)}</p>
          </div>
          <div className={cn('text-3xl font-bold', directionColor)}>
            {directionIcon}
            <span className="text-lg ml-1">{Math.abs(insight.change).toFixed(0)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CorrelationCard({ insight }: { insight: CorrelationInsight }) {
  const isPositive = insight.correlation > 0;

  return (
    <Card>
      <CardContent>
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-xl',
            isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
          )}>
            {isPositive ? '\u{1F4C8}' : '\u{1F4C9}'}
          </div>
          <div className="flex-1">
            <p className="text-text font-medium">{insight.habitName}</p>
            <p className="text-text-muted text-sm">{insight.impact}</p>
            <p className="text-text-dim text-xs mt-1">
              Корреляция: {(insight.correlation * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonCard({ insight }: { insight: ComparisonInsight }) {
  const metricLabel = insight.metric === 'mood' ? 'Настроение' : 'Энергия';
  const isImproved = insight.change > 0;

  return (
    <Card>
      <CardContent>
        <p className="text-text-muted text-sm mb-3">{metricLabel}: сравнение</p>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <p className="text-text-dim text-xs">{insight.previousPeriod.label}</p>
            <p className="text-xl font-bold text-text-muted">
              {insight.previousPeriod.average.toFixed(1)}
            </p>
          </div>

          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            isImproved ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          )}>
            {isImproved ? '+' : ''}{insight.change.toFixed(0)}%
          </div>

          <div className="flex-1 text-center">
            <p className="text-text-dim text-xs">{insight.currentPeriod.label}</p>
            <p className="text-xl font-bold text-text">
              {insight.currentPeriod.average.toFixed(1)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TextCard({ insight }: { insight: TextInsight }) {
  const categoryStyles = {
    positive: 'border-l-green-400 bg-green-500/5',
    negative: 'border-l-red-400 bg-red-500/5',
    neutral: 'border-l-blue-400 bg-blue-500/5',
  }[insight.category];

  const categoryIcon = {
    positive: '\u2728',
    negative: '\u26A0\uFE0F',
    neutral: '\u{1F4A1}',
  }[insight.category];

  return (
    <Card className={cn('border-l-4', categoryStyles)}>
      <CardContent>
        <div className="flex items-start gap-3">
          <span className="text-xl">{categoryIcon}</span>
          <p className="text-text">{insight.message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function Insights() {
  const { habits } = useHabits();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevDataRef = useRef<string>('');

  // Fetch entries for last 60 days
  const entries = useLiveQuery(() => getEntriesForAnalytics(60), []);

  // Generate insights when data changes, with deduplication
  useEffect(() => {
    if (entries === undefined || habits.length === 0) return;

    // Avoid re-running if data hasn't actually changed
    const dataKey = JSON.stringify({ e: entries.length, h: habits.map(h => h.id) });
    if (dataKey === prevDataRef.current) return;
    prevDataRef.current = dataKey;

    setIsLoading(true);
    generateInsights(entries, habits)
      .then(setInsights)
      .finally(() => setIsLoading(false));
  }, [entries, habits]);

  // Memoize filtered insights to prevent unnecessary re-renders
  const trends = useMemo(() => insights.filter((i): i is TrendInsight => i.type === 'trend'), [insights]);
  const correlations = useMemo(() => insights.filter((i): i is CorrelationInsight => i.type === 'correlation'), [insights]);
  const comparisons = useMemo(() => insights.filter((i): i is ComparisonInsight => i.type === 'comparison'), [insights]);
  const texts = useMemo(() => insights.filter((i): i is TextInsight => i.type === 'text'), [insights]);

  if (isLoading) {
    return (
      <div className="flex-1 pb-24 lg:pb-8 px-4 lg:px-6 pt-6 lg:pt-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-center h-64">
          <p className="text-text-muted">Анализирую данные...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-24 lg:pb-8 px-4 lg:px-6 pt-6 lg:pt-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text">Инсайты</h1>
        <p className="text-text-muted text-sm">Что влияет на ваше самочувствие</p>
      </header>

      {/* Text insights (most important) */}
      {texts.length > 0 && (
        <section className="mb-8 space-y-3 xl:max-w-3xl">
          {texts.map((insight, index) => (
            <TextCard key={`text-${index}`} insight={insight} />
          ))}
        </section>
      )}

      {/* Trends */}
      {trends.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text mb-4">Тренды</h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {trends.map((insight, index) => (
              <TrendCard key={`trend-${index}`} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {/* Comparisons */}
      {comparisons.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text mb-4">Сравнение</h2>
          <div className="grid xl:grid-cols-2 gap-3">
            {comparisons.map((insight, index) => (
              <ComparisonCard key={`comparison-${index}`} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {/* Correlations */}
      {correlations.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text mb-4">Влияние привычек</h2>
          <div className="grid xl:grid-cols-2 gap-3">
            {correlations.map((insight, index) => (
              <CorrelationCard key={`correlation-${index}`} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {insights.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-4xl mb-4">{'\u{1F4CA}'}</p>
            <p className="text-text font-medium mb-2">Пока недостаточно данных</p>
            <p className="text-text-muted text-sm">
              Продолжайте трекать настроение и привычки.
              Инсайты появятся после 7+ дней.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
