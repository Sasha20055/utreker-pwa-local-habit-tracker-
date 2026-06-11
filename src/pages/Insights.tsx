import { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent } from '@/components/ui';
import { useHabits } from '@/hooks';
import { getEntriesForAnalytics } from '@/lib/db';
import { generateInsights } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks';
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

const CONFIDENCE_META: Record<CorrelationInsight['confidence'], { label: string; className: string }> = {
  high: { label: 'высокая уверенность', className: 'bg-green-500/15 text-green-400' },
  medium: { label: 'средняя уверенность', className: 'bg-yellow-500/15 text-yellow-400' },
  low: { label: 'мало данных', className: 'bg-surface text-text-muted' },
};

function CorrelationCard({ insight }: { insight: CorrelationInsight }) {
  const [expanded, setExpanded] = useState(false);
  const isPositive = insight.correlation > 0;
  const metricLabel = insight.metric === 'mood' ? 'настроение' : 'энергия';
  const confidence = CONFIDENCE_META[insight.confidence];

  return (
    <Card>
      <CardContent>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-left"
          aria-expanded={expanded}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0',
              isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
            )}>
              {isPositive ? '\u{1F4C8}' : '\u{1F4C9}'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-text font-medium">{insight.habitName}</p>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full', confidence.className)}>
                  {confidence.label}
                </span>
              </div>
              <p className="text-text-muted text-sm">{insight.impact}</p>
              <p className="text-text-dim text-xs mt-1">
                Связь: {Math.abs(insight.correlation * 100).toFixed(0)}% · {insight.sampleWith}/{insight.sampleWithout} дней с/без · нажмите для деталей
              </p>
            </div>
          </div>
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-center">
            <div className="glass rounded-xl p-2">
              <div className="text-xs text-text-muted">С привычкой</div>
              <div className="text-lg font-bold text-text">{insight.avgWith.toFixed(1)}</div>
              <div className="text-[10px] text-text-dim">{metricLabel}, {insight.sampleWith} дн.</div>
            </div>
            <div className="glass rounded-xl p-2">
              <div className="text-xs text-text-muted">Без привычки</div>
              <div className="text-lg font-bold text-text">{insight.avgWithout.toFixed(1)}</div>
              <div className="text-[10px] text-text-dim">{metricLabel}, {insight.sampleWithout} дн.</div>
            </div>
            <p className="col-span-2 text-[11px] text-text-dim">
              Дни с тегами болезни, стресса и поездок исключены из расчёта, чтобы не искажать связь.
            </p>
          </div>
        )}
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
  usePageTitle('Инсайты — что влияет на ваше самочувствие');
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
  const hasRealInsights = trends.length > 0 || correlations.length > 0 || comparisons.length > 0;

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

      {/* Rich empty state: show what insights will look like before there's enough data */}
      {!hasRealInsights && (
        <section className="space-y-4 xl:max-w-3xl">
          <Card>
            <CardContent className="py-6 text-center space-y-2">
              <p className="text-4xl">{'\u{1F4CA}'}</p>
              <p className="text-text font-medium">Инсайты появятся после 7+ дней</p>
              <p className="text-text-muted text-sm">
                Отмечайте настроение, энергию и привычки — и приложение само найдёт закономерности.
                Дни с тегами болезни, стресса и поездок исключаются, чтобы связи были честными.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-xs text-text-dim uppercase tracking-wide">Так это будет выглядеть</p>
            <div className="relative opacity-70">
              <span className="absolute -top-2 right-2 z-10 text-[10px] px-2 py-0.5 rounded-full bg-surface text-text-muted">
                пример
              </span>
              <CorrelationCard
                insight={{
                  type: 'correlation',
                  habitId: 'sample',
                  habitName: 'Спорт',
                  metric: 'mood',
                  correlation: 0.58,
                  impact: 'Заметно чаще совпадает с лучшим настроением',
                  confidence: 'high',
                  sampleWith: 14,
                  sampleWithout: 9,
                  avgWith: 4.1,
                  avgWithout: 3.2,
                }}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
