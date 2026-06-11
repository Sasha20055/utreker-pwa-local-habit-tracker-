import { type ClassValue, clsx } from 'clsx';

// Simple cn utility (like shadcn but without tailwind-merge for smaller bundle)
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// Format date for display
export function formatDate(date: Date, locale = 'ru-RU'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function formatDateShort(date: Date, locale = 'ru-RU'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatMonthYear(date: Date, locale = 'ru-RU'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

// Get day name
export function getDayName(date: Date, locale = 'ru-RU'): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
}

// Check if date is today
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Get mood color based on level
export function getMoodColor(mood: number | null): string {
  if (mood === null) return 'var(--color-text-dim)';
  const colors: Record<number, string> = {
    1: 'var(--color-mood-1)',
    2: 'var(--color-mood-2)',
    3: 'var(--color-mood-3)',
    4: 'var(--color-mood-4)',
    5: 'var(--color-mood-5)',
  };
  return colors[mood] || 'var(--color-text-dim)';
}

// Get energy color based on level
export function getEnergyColor(energy: number | null): string {
  if (energy === null) return 'var(--color-text-dim)';
  const colors: Record<number, string> = {
    1: 'var(--color-energy-1)',
    2: 'var(--color-energy-2)',
    3: 'var(--color-energy-3)',
    4: 'var(--color-energy-4)',
    5: 'var(--color-energy-5)',
  };
  return colors[energy] || 'var(--color-text-dim)';
}

// Monday-based start of the week for a given date (matches the Russian calendar)
export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

// Generate array of days for calendar
export function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get day of week for first day (0 = Sunday, 1 = Monday, ...)
  // Adjust for Monday start (Russian calendar)
  let startPadding = firstDay.getDay() - 1;
  if (startPadding < 0) startPadding = 6;

  const days: (Date | null)[] = [];

  // Add padding for days before month starts
  for (let i = 0; i < startPadding; i++) {
    days.push(null);
  }

  // Add actual days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}

// Debounce function
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Percentage change calculation
export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Round to decimal places
export function round(value: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
