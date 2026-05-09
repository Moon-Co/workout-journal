import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useWorkoutStore } from '@/store/workoutStore';
import { useLibraryStore } from '@/store/libraryStore';
import { saveWorkout } from '@/db/database';
import WorkoutTimer from '@/components/WorkoutTimer';
import ExercisePicker from '@/components/ExercisePicker';

function fmtElapsed(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function RecordScreen() {
  const {
    title, exercises, setTitle,
    addExercise, removeExercise, addSet, removeSet, updateSet, reset,
  } = useWorkoutStore();
  const { bodyParts } = useLibraryStore();

  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function startSession() {
    elapsedRef.current = 0;
    setElapsed(0);
    setIsActive(true);
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  }

  async function finishSession() {
    if (exercises.length === 0) {
      Alert.alert('운동을 추가해주세요');
      return;
    }
    const valid = exercises.every(e => e.sets.every(s => s.weight && s.reps));
    if (!valid) {
      Alert.alert('모든 세트의 무게와 횟수를 입력해주세요');
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    const duration = elapsedRef.current;
    const today = new Date().toISOString().split('T')[0];
    const finalTitle = title.trim() || `운동 ${today}`;

    await saveWorkout(
      finalTitle,
      today,
      exercises.map(e => ({
        name: e.name,
        sets: e.sets.map(s => ({
          weight: parseFloat(s.weight),
          reps: parseInt(s.reps, 10),
        })),
      })),
      duration
    );

    Alert.alert('운동 완료! 💪', `총 ${fmtElapsed(duration)} 운동했어요.`);
    reset();
    setIsActive(false);
    setElapsed(0);
    elapsedRef.current = 0;
  }

  const alreadySelected = exercises.map(e => e.exerciseId);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0f0f0f' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── 휴식 타이머 (좌상단 floating) ── */}
      <WorkoutTimer />

      {/* ── 헤더 ── */}
      <View style={styles.header}>
        {/* 좌측 타이머 공간 확보 */}
        <View style={{ width: 80 }} />

        <Text style={styles.headerTitle}>운동 기록</Text>

        {/* 우측: 세션 경과시간 + 완료 */}
        {isActive ? (
          <View style={styles.headerRight}>
            <Text style={styles.elapsed}>{fmtElapsed(elapsed)}</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={finishSession}>
              <Text style={styles.doneBtnText}>완료</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 제목 */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="운동 제목 (예: 가슴 운동)"
          placeholderTextColor="#555"
        />

        {/* 빈 상태 */}
        {exercises.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>운동을 추가해보세요</Text>
          </View>
        )}

        {/* 운동 카드 */}
        {exercises.map(ex => (
          <View key={ex.id} style={styles.exerciseCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.bpLabel}>
                  {bodyParts.find(b => b.id === ex.bodyPart)?.name ?? ex.bodyPart}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.setRow}>
              <Text style={[styles.setLabel, { width: 32 }]}>세트</Text>
              <Text style={[styles.setLabel, { flex: 1 }]}>무게 (kg)</Text>
              <Text style={[styles.setLabel, { flex: 1 }]}>횟수</Text>
              <View style={{ width: 28 }} />
            </View>

            {ex.sets.map((set, sIdx) => (
              <View key={sIdx} style={styles.setRow}>
                <Text style={[styles.setNum, { width: 32 }]}>{sIdx + 1}</Text>
                <TextInput
                  style={[styles.setInput, { flex: 1, marginRight: 8 }]}
                  placeholder="0" placeholderTextColor="#555"
                  keyboardType="numeric" value={set.weight}
                  onChangeText={v => updateSet(ex.id, sIdx, 'weight', v)}
                />
                <TextInput
                  style={[styles.setInput, { flex: 1 }]}
                  placeholder="0" placeholderTextColor="#555"
                  keyboardType="numeric" value={set.reps}
                  onChangeText={v => updateSet(ex.id, sIdx, 'reps', v)}
                />
                {ex.sets.length > 1 ? (
                  <TouchableOpacity
                    style={{ width: 28, alignItems: 'center' }}
                    onPress={() => removeSet(ex.id, sIdx)}
                  >
                    <Text style={styles.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                ) : <View style={{ width: 28 }} />}
              </View>
            ))}

            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ex.id)}>
              <Text style={styles.addSetBtnText}>+ 세트 추가</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* + 운동 추가 */}
        <TouchableOpacity
          style={styles.addExBtn}
          onPress={() => setPickerVisible(true)}
        >
          <Text style={styles.addExBtnText}>+ 운동 추가</Text>
        </TouchableOpacity>

        {/* 운동 시작 버튼 (세션 미시작 상태) */}
        {!isActive && (
          <TouchableOpacity style={styles.startBtn} onPress={startSession}>
            <Text style={styles.startBtnText}>운동 시작! 🔥</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        alreadySelected={alreadySelected}
        onSelect={(picked) => {
          picked.forEach(ex => addExercise(ex.id, ex.name, ex.bodyPartId));
        }}
      />
    </KeyboardAvoidingView>
  );
}

const HEADER_TOP = Platform.OS === 'ios' ? 54 : 32;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: HEADER_TOP,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  elapsed: { color: '#4CAF50', fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  doneBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 10,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  content: { padding: 20, paddingBottom: 60 },

  titleInput: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 20,
    borderWidth: 1, borderColor: '#2a2a2a',
  },

  emptyBox: {
    padding: 40, alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    borderColor: '#2a2a2a', borderStyle: 'dashed', marginBottom: 16,
  },
  emptyText: { color: '#444', fontSize: 15 },

  exerciseCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  exerciseName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bpLabel: { color: '#6C63FF', fontSize: 12, marginTop: 2 },
  deleteBtn: { color: '#ff4444', fontSize: 16, paddingLeft: 12 },

  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  setLabel: { color: '#666', fontSize: 12, textAlign: 'center' },
  setNum: { color: '#888', fontSize: 14, textAlign: 'center' },
  setInput: {
    backgroundColor: '#252525', borderRadius: 8, padding: 10,
    color: '#fff', fontSize: 15, textAlign: 'center',
  },
  addSetBtn: { marginTop: 4, alignSelf: 'flex-start' },
  addSetBtnText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },

  addExBtn: {
    borderWidth: 1.5, borderColor: '#6C63FF', borderStyle: 'dashed',
    borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12,
  },
  addExBtnText: { color: '#6C63FF', fontSize: 16, fontWeight: '600' },

  startBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    padding: 18, alignItems: 'center', marginTop: 4,
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
