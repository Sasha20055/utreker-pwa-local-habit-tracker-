import { db } from './db';
import type { DayEntry, Habit, Tombstone } from '@/types';

export interface SyncPayload {
  version: 1;
  timestamp: string;
  data: {
    habits: Habit[];
    days: DayEntry[];
  };
  tombstones?: Tombstone[]; // deletions to propagate (optional for backward compat)
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
  const tombstones = await db.tombstones.toArray();

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    data: { habits, days },
    tombstones,
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
  const remoteTombstones = reviveDates(payload.tombstones ?? []) as Tombstone[];

  await db.transaction('rw', db.habits, db.days, db.tombstones, async () => {
    // Combine local + remote tombstones, keeping the latest deletedAt per key.
    const localTombstones = await db.tombstones.toArray();
    const tombMap = new Map<string, Tombstone>();
    for (const t of [...localTombstones, ...remoteTombstones]) {
      const existing = tombMap.get(t.key);
      if (!existing || existing.deletedAt.getTime() < t.deletedAt.getTime()) {
        tombMap.set(t.key, t);
      }
    }
    // Persist the merged tombstones so deletions keep propagating.
    if (tombMap.size > 0) {
      await db.tombstones.bulkPut([...tombMap.values()]);
    }

    // A deletion wins over an incoming record only if it happened after that record's last edit.
    const isTombstoned = (type: Tombstone['type'], id: string, updatedAt?: Date): boolean => {
      const t = tombMap.get(`${type}:${id}`);
      return t ? t.deletedAt.getTime() >= (updatedAt?.getTime() ?? 0) : false;
    };

    // Merge Habits (skip ones a newer tombstone has deleted)
    for (const remoteHabit of remoteHabits) {
      if (isTombstoned('habit', remoteHabit.id, remoteHabit.updatedAt)) continue;
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

    // Merge Days (skip ones a newer tombstone has deleted)
    for (const remoteDay of remoteDays) {
      if (isTombstoned('day', remoteDay.id, remoteDay.updatedAt)) continue;
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

    // Apply tombstones to local records that haven't been edited since the deletion.
    for (const t of tombMap.values()) {
      if (t.type === 'habit') {
        const local = await db.habits.get(t.entityId);
        if (local && (local.updatedAt?.getTime() ?? 0) <= t.deletedAt.getTime()) {
          await db.habits.delete(t.entityId);
        }
      } else {
        const local = await db.days.get(t.entityId);
        if (local && (local.updatedAt?.getTime() ?? 0) <= t.deletedAt.getTime()) {
          await db.days.delete(t.entityId);
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
