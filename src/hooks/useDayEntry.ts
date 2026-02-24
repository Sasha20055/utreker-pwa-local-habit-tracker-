import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDayEntry, saveDayEntry, getDateId } from '@/lib/db';
import type { DayEntry, MoodLevel, EnergyLevel, HabitProgress, ContextTag } from '@/types';
import { debounce } from '@/lib/utils';

interface UseDayEntryOptions {
  date?: Date;
  autoSave?: boolean;
  debounceMs?: number;
}

export function useDayEntry(options: UseDayEntryOptions = {}) {
  const { date = new Date(), autoSave = true, debounceMs = 500 } = options;

  const dateId = getDateId(date);
  const createEmptyEntry = useCallback(
    (): Partial<DayEntry> => ({
      date,
      mood: null,
      energy: null,
      habits: [],
      notes: '',
      tags: [],
    }),
    [dateId]
  );

  // Live query for the day entry
  const entry = useLiveQuery(() => getDayEntry(date), [dateId]);

  // Local state for optimistic updates
  const [localEntry, setLocalEntry] = useState<Partial<DayEntry>>(createEmptyEntry);
  const [isSaving, setIsSaving] = useState(false);

  // Use ref to access latest localEntry without adding it to dependencies
  const localEntryRef = useRef(localEntry);
  localEntryRef.current = localEntry;

  // Sync local state with DB entry
  useEffect(() => {
    if (entry) {
      setLocalEntry(entry);
    } else if (entry === undefined) {
      setLocalEntry(createEmptyEntry());
    }
  }, [entry, createEmptyEntry]);

  // Debounced save function - stable reference
  const debouncedSave = useCallback(
    debounce(async (data: Partial<DayEntry> & { date: Date }) => {
      setIsSaving(true);
      try {
        await saveDayEntry(data);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs),
    [debounceMs]
  );

  // Save function - uses ref instead of localEntry in deps to break the cycle
  const save = useCallback(
    (data: Partial<DayEntry>) => {
      const newEntry = { ...localEntryRef.current, ...data, date };
      setLocalEntry(newEntry);

      if (autoSave) {
        debouncedSave(newEntry);
      }
    },
    [date, autoSave, debouncedSave]
  );

  // Update mood
  const setMood = useCallback(
    (mood: MoodLevel) => {
      save({ mood });
    },
    [save]
  );

  // Update energy
  const setEnergy = useCallback(
    (energy: EnergyLevel) => {
      save({ energy });
    },
    [save]
  );

  // Update habit progress - uses ref instead of localEntry.habits
  const setHabitProgress = useCallback(
    (progress: HabitProgress) => {
      const currentHabits = localEntryRef.current.habits ?? [];
      const existingIndex = currentHabits.findIndex((h) => h.habitId === progress.habitId);

      let newHabits: HabitProgress[];
      if (existingIndex >= 0) {
        newHabits = [...currentHabits];
        newHabits[existingIndex] = progress;
      } else {
        newHabits = [...currentHabits, progress];
      }

      save({ habits: newHabits });
    },
    [save]
  );

  // Update notes
  const setNotes = useCallback(
    (notes: string) => {
      save({ notes });
    },
    [save]
  );

  // Update tags
  const setTags = useCallback(
    (tags: ContextTag[]) => {
      save({ tags });
    },
    [save]
  );

  // Force save (bypass debounce)
  const forceSave = useCallback(async () => {
    const current = localEntryRef.current;
    if (current.date) {
      setIsSaving(true);
      try {
        await saveDayEntry(current as Partial<DayEntry> & { date: Date });
      } finally {
        setIsSaving(false);
      }
    }
  }, []);

  return {
    entry: localEntry,
    isLoading: entry === undefined,
    isSaving,
    setMood,
    setEnergy,
    setHabitProgress,
    setNotes,
    setTags,
    forceSave,
  };
}
