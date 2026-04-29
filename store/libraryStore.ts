import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BodyPart = { id: string; name: string };
export type Exercise = { id: string; bodyPartId: string; name: string };

const DEFAULT_BODY_PARTS: BodyPart[] = [
  { id: 'chest', name: '가슴' },
  { id: 'back', name: '등' },
  { id: 'legs', name: '하체' },
  { id: 'shoulder', name: '어깨' },
  { id: 'arms', name: '팔' },
  { id: 'core', name: '복근' },
];

const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'bench_press', bodyPartId: 'chest', name: '벤치프레스' },
  { id: 'incline_bench', bodyPartId: 'chest', name: '인클라인 벤치프레스' },
  { id: 'cable_fly', bodyPartId: 'chest', name: '케이블 플라이' },
  { id: 'deadlift', bodyPartId: 'back', name: '데드리프트' },
  { id: 'pullup', bodyPartId: 'back', name: '풀업' },
  { id: 'barbell_row', bodyPartId: 'back', name: '바벨 로우' },
  { id: 'lat_pulldown', bodyPartId: 'back', name: '랫 풀다운' },
  { id: 'squat', bodyPartId: 'legs', name: '스쿼트' },
  { id: 'leg_press', bodyPartId: 'legs', name: '레그프레스' },
  { id: 'lunge', bodyPartId: 'legs', name: '런지' },
  { id: 'leg_curl', bodyPartId: 'legs', name: '레그컬' },
  { id: 'ohp', bodyPartId: 'shoulder', name: '오버헤드프레스' },
  { id: 'lateral_raise', bodyPartId: 'shoulder', name: '사이드 레터럴 레이즈' },
  { id: 'front_raise', bodyPartId: 'shoulder', name: '프론트 레이즈' },
  { id: 'barbell_curl', bodyPartId: 'arms', name: '바벨 컬' },
  { id: 'hammer_curl', bodyPartId: 'arms', name: '해머 컬' },
  { id: 'tricep_pushdown', bodyPartId: 'arms', name: '트라이셉 푸시다운' },
  { id: 'crunch', bodyPartId: 'core', name: '크런치' },
  { id: 'plank', bodyPartId: 'core', name: '플랭크' },
];

type LibraryStore = {
  bodyParts: BodyPart[];
  exercises: Exercise[];
  addBodyPart: (name: string) => void;
  deleteBodyPart: (id: string) => void;
  addExercise: (bodyPartId: string, name: string) => void;
  deleteExercise: (id: string) => void;
  getExercisesByBodyPart: (bodyPartId: string) => Exercise[];
};

export const useLibraryStore = create<LibraryStore>()(
  persist(
    (set, get) => ({
      bodyParts: DEFAULT_BODY_PARTS,
      exercises: DEFAULT_EXERCISES,

      addBodyPart: (name) =>
        set((s) => ({
          bodyParts: [...s.bodyParts, { id: Date.now().toString(), name }],
        })),

      deleteBodyPart: (id) =>
        set((s) => ({
          bodyParts: s.bodyParts.filter((b) => b.id !== id),
          exercises: s.exercises.filter((e) => e.bodyPartId !== id),
        })),

      addExercise: (bodyPartId, name) =>
        set((s) => ({
          exercises: [
            ...s.exercises,
            { id: Date.now().toString(), bodyPartId, name },
          ],
        })),

      deleteExercise: (id) =>
        set((s) => ({
          exercises: s.exercises.filter((e) => e.id !== id),
        })),

      getExercisesByBodyPart: (bodyPartId) =>
        get().exercises.filter((e) => e.bodyPartId === bodyPartId),
    }),
    {
      name: 'exercise-library',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
