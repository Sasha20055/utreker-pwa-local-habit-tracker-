import { useState } from 'react';
import { cn } from '@/lib/utils';

const ONBOARDED_KEY = 'utreker_onboarded';

export function hasOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === 'true';
}

interface Step {
  icon: string;
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    icon: '🌅',
    title: 'Добро пожаловать в utreker',
    body: (
      <>
        Это трекер не только привычек, но и состояния. Отмечайте настроение, энергию и контекст
        дня — и со временем увидите, что на самом деле на вас влияет.
      </>
    ),
  },
  {
    icon: '✍️',
    title: 'Как это работает',
    body: (
      <ul className="space-y-2 text-left">
        <li>• Настроение и энергия по шкале 1–5 — пара касаний в день.</li>
        <li>• Привычки, недельные квоты и цели с прогрессом.</li>
        <li>• Теги дня (болезнь, поездка, отдых) — такие дни не считаются пропуском.</li>
      </ul>
    ),
  },
  {
    icon: '🔒',
    title: 'Приватно и бесплатно',
    body: (
      <>
        Все данные хранятся локально на вашем устройстве — без аккаунта, без рекламы, без подписки.
        Через 7+ дней появятся тренды и честные корреляции «привычка ↔ самочувствие».
      </>
    ),
  },
];

export function Onboarding() {
  const [visible, setVisible] = useState(() => !hasOnboarded());
  const [step, setStep] = useState(0);

  if (!visible) return null;

  const finish = () => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    setVisible(false);
  };

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-3xl p-6 max-w-md w-full text-center space-y-5 slide-up">
        <div className="text-5xl">{current.icon}</div>
        <h2 className="text-xl font-bold text-text">{current.title}</h2>
        <div className="text-sm text-text-muted leading-relaxed">{current.body}</div>

        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === step ? 'w-5 bg-primary' : 'w-1.5 bg-surface-active'
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={finish}
            className="text-sm text-text-muted hover:text-text px-2 py-2"
          >
            Пропустить
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 rounded-xl bg-surface text-text hover:bg-surface-active transition-colors text-sm"
              >
                Назад
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              className="btn-primary px-5 py-2 text-sm"
            >
              {isLast ? 'Начать' : 'Далее'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
