import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RoutineExercise = {
  exerciseId: string;
  name: string;
  bodyPartId: string;
  defaultSets: number;
};

export type Routine = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
};

type RoutineStore = {
  routines: Routine[];
  addRoutine: (name: string, exercises: RoutineExercise[]) => void;
  updateRoutine: (id: string, name: string, exercises: RoutineExercise[]) => void;
  deleteRoutine: (id: string) => void;
};

export const useRoutineStore = create<RoutineStore>()(
  persist(
    (set) => ({
      routines: [],

      addRoutine: (name, exercises) =>
        set((s) => ({
          routines: [
            ...s.routines,
            { id: Date.now().toString(), name, exercises },
          ],
        })),

      updateRoutine: (id, name, exercises) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === id ? { ...r, name, exercises } : r
          ),
        })),

      deleteRoutine: (id) =>
        set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),
    }),
    {
      name: 'routines',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
