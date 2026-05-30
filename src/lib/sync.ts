import { db } from './db';
import type { DayEntry, Habit } from '@/types';

export interface SyncPayload {
  version: 1;
  timestamp: string;
  data: {
    habits: Habit[];
    days: DayEntry[];
  };
}

// Convert date strings back to Date objects after JSON parse
function reviveDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d*)?(?:[-+]\d{2}:?\d{2}|Z)?$/;
    if (dateRegex.test(obj)) {
      return new Date(obj);
    }
  }
  if (typeof obj === 'object') {
    for (const key in obj) {
      obj[key] = reviveDates(obj[key]);
    }
  }
  return obj;
}

export async function generateSyncPayload(): Promise<SyncPayload> {
  const habits = await db.habits.toArray();
  const days = await db.days.toArray();

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    data: { habits, days },
  };
}

export async function exportDataToFile(): Promise<void> {
  const payload = await generateSyncPayload();
  const dataStr = JSON.stringify(payload, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  link.download = `utreker-backup-${dateStr}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function mergeSyncPayload(payload: SyncPayload): Promise<void> {
  if (payload.version !== 1 || !payload.data) {
    throw new Error('Invalid backup format');
  }

  const remoteHabits = reviveDates(payload.data.habits) as Habit[];
  const remoteDays = reviveDates(payload.data.days) as DayEntry[];

  await db.transaction('rw', db.habits, db.days, async () => {
    // Merge Habits
    for (const remoteHabit of remoteHabits) {
      const localHabit = await db.habits.get(remoteHabit.id);
      if (!localHabit) {
        await db.habits.add(remoteHabit);
      } else {
        const localUpdate = localHabit.updatedAt?.getTime() || 0;
        const remoteUpdate = remoteHabit.updatedAt?.getTime() || 0;
        if (remoteUpdate > localUpdate) {
          await db.habits.put(remoteHabit);
        }
      }
    }

    // Merge Days
    for (const remoteDay of remoteDays) {
      const localDay = await db.days.get(remoteDay.id);
      if (!localDay) {
        await db.days.add(remoteDay);
      } else {
        const localUpdate = localDay.updatedAt?.getTime() || 0;
        const remoteUpdate = remoteDay.updatedAt?.getTime() || 0;
        if (remoteUpdate > localUpdate) {
          await db.days.put(remoteDay);
        }
      }
    }
  });
}

export async function importDataFromFile(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const payload = JSON.parse(content) as SyncPayload;
        await mergeSyncPayload(payload);
        resolve();
      } catch (err) {
        console.error('Import failed', err);
        reject(new Error('Не удалось прочитать файл резервной копии. Проверьте формат.'));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}
