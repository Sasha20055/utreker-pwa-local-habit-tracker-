import Dexie, { type EntityTable } from 'dexie';
import { format } from 'date-fns';
import type { DayEntry, Habit, Tombstone } from '@/types';
import { DEFAULT_HABITS as defaultHabits } from '@/types';

// Database schema
class UtrekerDatabase extends Dexie {
  days!: EntityTable<DayEntry, 'id'>;
  habits!: EntityTable<Habit, 'id'>;
  tombstones!: EntityTable<Tombstone, 'key'>;

  constructor() {
    super('utreker');

    this.version(1).stores({
      days: 'id, date',
      habits: 'id, order, isActive',
    });

    // v2: tombstones record deletions so they propagate across devices via sync
    this.version(2).stores({
      days: 'id, date',
      habits: 'id, order, isActive',
      tombstones: 'key, deletedAt',
    });
  }
}

export const db = new UtrekerDatabase();
let initPromise: Promise<void> | null = null;

// Helper to generate date ID
export function getDateId(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

// Notify app about data changes for auto-sync
export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('utreker-data-changed'));
  }
}

// Day entry operations
export async function getDayEntry(date: Date = new Date()): Promise<DayEntry | undefined> {
  const id = getDateId(date);
  return db.days.get(id);
}

export async function getDayEntries(startDate: Date, endDate: Date): Promise<DayEntry[]> {
  const startId = getDateId(startDate);
  const endId = getDateId(endDate);

  return db.days
    .where('id')
    .between(startId, endId, true, true)
    .toArray();
}

export async function saveDayEntry(entry: Partial<DayEntry> & { date: Date }): Promise<string> {
  const id = getDateId(entry.date);
  const now = new Date();

  const existing = await db.days.get(id);

  if (existing) {
    await db.days.update(id, {
      ...entry,
      updatedAt: now,
    });
  } else {
    await db.days.add({
      id,
      date: entry.date,
      mood: entry.mood ?? null,
      energy: entry.energy ?? null,
      habits: entry.habits ?? [],
      notes: entry.notes ?? '',
      tags: entry.tags ?? [],
      createdAt: now,
      updatedAt: now,
    });
  }

  notifyDataChanged();
  return id;
}

// Habit operations
export async function getHabits(): Promise<Habit[]> {
  return db.habits.orderBy('order').toArray();
}

export async function getActiveHabits(): Promise<Habit[]> {
  const habits = await db.habits.orderBy('order').toArray();
  return habits.filter((habit) => habit.isActive);
}

export async function createHabit(habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  await db.habits.add({
    ...habit,
    id,
    createdAt: now,
    updatedAt: now,
  });
  notifyDataChanged();
  return id;
}

export async function updateHabit(id: string, updates: Partial<Habit>): Promise<void> {
  await db.habits.update(id, { ...updates, updatedAt: new Date() });
  notifyDataChanged();
}

// Record tombstones so a deletion isn't resurrected by a later sync/merge
export async function recordTombstones(
  type: Tombstone['type'],
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const deletedAt = new Date();
  await db.tombstones.bulkPut(
    ids.map((entityId) => ({ key: `${type}:${entityId}`, type, entityId, deletedAt }))
  );
}

export async function getTombstones(): Promise<Tombstone[]> {
  return db.tombstones.toArray();
}

export async function deleteHabit(id: string): Promise<void> {
  await recordTombstones('habit', [id]);
  await db.habits.delete(id);
  notifyDataChanged();
}

export async function deleteHabits(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await recordTombstones('habit', ids);
  await db.habits.bulkDelete(ids);
  notifyDataChanged();
}

export async function reorderHabits(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.habits, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.habits.update(orderedIds[i], { order: i });
    }
  });
  notifyDataChanged();
}

// Seed default habits on first launch
export async function seedDefaultHabits(): Promise<void> {
  const existingHabits = await db.habits.count();

  if (existingHabits === 0) {
    const now = new Date();
    const habitsToAdd = defaultHabits.map((habit, index) => ({
      ...habit,
      id: `default-${index + 1}`,
      order: index,
      createdAt: now,
      updatedAt: now,
    }));

    await db.habits.bulkPut(habitsToAdd);
  }
}

function habitFrequencyKey(habit: Habit | Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): string {
  if (habit.frequency.type === 'daily') return 'daily';
  if (habit.frequency.type === 'weekly_days') {
    return `weekly_days:${(habit.frequency.weeklyDays ?? []).join(',')}`;
  }
  return `weekly_times:${habit.frequency.timesPerWeek ?? 0}`;
}

function defaultHabitSignature(habit: Habit | Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): string {
  return [
    habit.name.trim().toLowerCase(),
    habit.icon,
    habit.type,
    habit.category,
    habit.target ?? 0,
    habitFrequencyKey(habit),
  ].join('|');
}

async function dedupeDefaultHabits(): Promise<void> {
  const habits = await db.habits.toArray();
  habits.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (habits.length === 0) return;

  const defaultSignatures = new Set(defaultHabits.map(defaultHabitSignature));
  const grouped = new Map<string, Habit[]>();

  for (const habit of habits) {
    const signature = defaultHabitSignature(habit);
    if (!defaultSignatures.has(signature)) continue;

    const signatureHabits = grouped.get(signature) ?? [];
    signatureHabits.push(habit);
    grouped.set(signature, signatureHabits);
  }

  const idsToDelete: string[] = [];
  for (const matches of grouped.values()) {
    if (matches.length <= 1) continue;
    const [, ...duplicates] = matches;
    idsToDelete.push(...duplicates.map((habit) => habit.id));
  }

  if (idsToDelete.length > 0) {
    await db.habits.bulkDelete(idsToDelete);
  }
}

async function normalizeHabitOrder(): Promise<void> {
  const habits = await db.habits.orderBy('order').toArray();
  await db.transaction('rw', db.habits, async () => {
    for (let index = 0; index < habits.length; index++) {
      await db.habits.update(habits[index].id, { order: index });
    }
  });
}

// Initialize database
export async function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await seedDefaultHabits();
      await dedupeDefaultHabits();
      await normalizeHabitOrder();
    })().finally(() => {
      initPromise = null;
    });
  }

  await initPromise;
}

// Analytics helpers
export async function getEntriesForAnalytics(days: number): Promise<DayEntry[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return getDayEntries(startDate, endDate);
}

export async function getMonthEntries(year: number, month: number): Promise<DayEntry[]> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month

  return getDayEntries(startDate, endDate);
}
