// Optional reflection prompts shown above the notes field to lower the blank-page friction.
export const REFLECTION_PROMPTS: string[] = [
  'Что сегодня получилось хорошо?',
  'Что повлияло на твоё настроение?',
  'За что ты сегодня благодарен?',
  'Что отняло больше всего энергии?',
  'Чему ты сегодня научился?',
  'Что бы ты сделал иначе?',
  'Какой момент дня хочется запомнить?',
  'Что помогло тебе сегодня?',
];

// Stable prompt for a given day so it rotates daily but doesn't jump around within a day.
export function getDailyPrompt(date: Date): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return REFLECTION_PROMPTS[dayOfYear % REFLECTION_PROMPTS.length];
}
