import { create } from 'zustand';

export type SetEntry = {
  weight: string;
  reps: string;
  completed: boolean;
};

export type ExerciseEntry = {
  id: string;
  exerciseId: string;
  name: string;
  bodyPart: string;
  sets: SetEntry[];
  note: string;
};

type WorkoutStore = {
  title: string;
  note: string;
  exercises: ExerciseEntry[];
  setTitle: (title: string) => void;
  setNote: (note: string) => void;
  addExercise: (exerciseId: string, name: string, bodyPart: string) => void;
  removeExercise: (id: string) => void;
  addSet: (id: string) => void;
  removeSet: (id: string, setIndex: number) => void;
  updateSet: (id: string, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  toggleSetComplete: (id: string, setIndex: number) => void;
  updateExerciseNote: (id: string, note: string) => void;
  reset: () => void;
};

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  title: '',
  note: '',
  exercises: [],

  setTitle: (title) => set({ title }),
  setNote: (note) => set({ note }),

  addExercise: (exerciseId, name, bodyPart) =>
    set((s) => ({
      exercises: [
        ...s.exercises,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          exerciseId,
          name,
          bodyPart,
          sets: [{ weight: '', reps: '', completed: false }],
          note: '',
        },
      ],
    })),

  removeExercise: (id) =>
    set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) })),

  addSet: (id) =>
    set((s) => ({
      exercises: s.exercises.map((e) =>
        e.id === id
          ? { ...e, sets: [...e.sets, { weight: '', reps: '', completed: false }] }
          : e
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

  toggleSetComplete: (id, setIndex) =>
    set((s) => ({
      exercises: s.exercises.map((e) =>
        e.id === id
          ? {
              ...e,
              sets: e.sets.map((st, i) =>
                i === setIndex ? { ...st, completed: !st.completed } : st
              ),
            }
          : e
      ),
    })),

  updateExerciseNote: (id, note) =>
    set((s) => ({
      exercises: s.exercises.map((e) =>
        e.id === id ? { ...e, note } : e
      ),
    })),

  reset: () => set({ title: '', note: '', exercises: [] }),
}));
