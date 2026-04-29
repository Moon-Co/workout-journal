import { create } from 'zustand';

export type SetEntry = {
  weight: string;
  reps: string;
};

export type ExerciseEntry = {
  id: string;
  exerciseId: string;
  name: string;
  bodyPart: string;
  sets: SetEntry[];
};

type WorkoutStore = {
  title: string;
  exercises: ExerciseEntry[];
  setTitle: (title: string) => void;
  addExercise: (exerciseId: string, name: string, bodyPart: string) => void;
  removeExercise: (id: string) => void;
  addSet: (id: string) => void;
  removeSet: (id: string, setIndex: number) => void;
  updateSet: (id: string, setIndex: number, field: keyof SetEntry, value: string) => void;
  reset: () => void;
};

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  title: '',
  exercises: [],

  setTitle: (title) => set({ title }),

  addExercise: (exerciseId, name, bodyPart) =>
    set((s) => ({
      exercises: [
        ...s.exercises,
        {
          id: Date.now().toString(),
          exerciseId,
          name,
          bodyPart,
          sets: [{ weight: '', reps: '' }],
        },
      ],
    })),

  removeExercise: (id) =>
    set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) })),

  addSet: (id) =>
    set((s) => ({
      exercises: s.exercises.map((e) =>
        e.id === id ? { ...e, sets: [...e.sets, { weight: '', reps: '' }] } : e
      ),
    })),

  removeSet: (id, setIndex) =>
    set((s) => ({
      exercises: s.exercises.map((e) =>
        e.id === id
          ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
          : e
      ),
    })),

  updateSet: (id, setIndex, field, value) =>
    set((s) => ({
      exercises: s.exercises.map((e) =>
        e.id === id
          ? {
              ...e,
              sets: e.sets.map((st, i) =>
                i === setIndex ? { ...st, [field]: value } : st
              ),
            }
          : e
      ),
    })),

  reset: () => set({ title: '', exercises: [] }),
}));
