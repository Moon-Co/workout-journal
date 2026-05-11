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
  duration?: number;
  note?: string;
};

export type BodyWeight = {
  id: string;
  date: string;
  weight: number;
};

const SESSIONS_KEY = 'workout_sessions';
const BODYWEIGHT_KEY = 'body_weights';

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
  duration?: number,
  note?: string
): Promise<void> {
  const sessions = await loadSessions();
  const newSession: WorkoutSession = {
    id: Date.now().toString(),
    title,
    date,
    exercises,
    duration,
    note,
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

// ── 체중 ──────────────────────────────────────────
export async function getBodyWeights(): Promise<BodyWeight[]> {
  const raw = await AsyncStorage.getItem(BODYWEIGHT_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveBodyWeight(weight: number, date: string): Promise<void> {
  const entries = await getBodyWeights();
  const idx = entries.findIndex(e => e.date === date);
  if (idx >= 0) {
    entries[idx] = { ...entries[idx], weight };
  } else {
    entries.unshift({ id: Date.now().toString(), date, weight });
  }
  await AsyncStorage.setItem(BODYWEIGHT_KEY, JSON.stringify(entries));
}

export async function deleteBodyWeight(id: string): Promise<void> {
  const entries = await getBodyWeights();
  await AsyncStorage.setItem(BODYWEIGHT_KEY, JSON.stringify(entries.filter(e => e.id !== id)));
}

// ── PR (종목별 최고 무게) ───────────────────────────
export async function getPRs(): Promise<Record<string, number>> {
  const sessions = await loadSessions();
  const prs: Record<string, number> = {};
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const maxWeight = Math.max(...exercise.sets.map(s => s.weight));
      if (!prs[exercise.name] || maxWeight > prs[exercise.name]) {
        prs[exercise.name] = maxWeight;
      }
    }
  }
  return prs;
}

// ── 백업 / 복원 ────────────────────────────────────
export async function exportAllData(): Promise<string> {
  const sessions = await loadSessions();
  const bodyWeights = await getBodyWeights();
  return JSON.stringify({ sessions, bodyWeights }, null, 2);
}

export async function importAllData(json: string): Promise<void> {
  const data = JSON.parse(json);
  if (data.sessions) await saveSessions(data.sessions);
  if (data.bodyWeights) {
    await AsyncStorage.setItem(BODYWEIGHT_KEY, JSON.stringify(data.bodyWeights));
  }
}
