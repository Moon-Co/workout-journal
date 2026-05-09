import AsyncStorage from '@react-native-async-storage/async-storage';

export type SetEntry = {
  weight: number;
  reps: number;
};

export type ExerciseEntry = {
  name: string;
  sets: SetEntry[];
};

export type WorkoutSession = {
  id: string;
  title: string;
  date: string;
  exercises: ExerciseEntry[];
  duration?: number; // 초 단위 세션 소요시간
};

const SESSIONS_KEY = 'workout_sessions';

async function loadSessions(): Promise<WorkoutSession[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveSessions(sessions: WorkoutSession[]): Promise<void> {
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function saveWorkout(
  title: string,
  date: string,
  exercises: ExerciseEntry[],
  duration?: number
): Promise<void> {
  const sessions = await loadSessions();
  const newSession: WorkoutSession = {
    id: Date.now().toString(),
    title,
    date,
    exercises,
    duration,
  };
  await saveSessions([newSession, ...sessions]);
}

export async function getAllSessions(): Promise<WorkoutSession[]> {
  return loadSessions();
}

export async function updateSession(updated: WorkoutSession): Promise<void> {
  const sessions = await loadSessions();
  await saveSessions(sessions.map((s) => (s.id === updated.id ? updated : s)));
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await loadSessions();
  await saveSessions(sessions.filter((s) => s.id !== id));
}
