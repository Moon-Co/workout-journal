import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/core';
import { useWorkoutStore } from '@/store/workoutStore';
import { useLibraryStore } from '@/store/libraryStore';
import { saveWorkout, getPRs } from '@/db/database';
import { useRoutineStore } from '@/store/routineStore';
import { requestNotificationPermission, sendNotification } from '@/utils/notify';
import WorkoutTimer from '@/components/WorkoutTimer';
import ExercisePicker from '@/components/ExercisePicker';

function fmtElapsed(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Epley 공식 1RM 계산
function calcOneRM(weight: string, reps: string): string | null {
  const w = parseFloat(weight);
  const r = parseInt(reps, 10);
  if (!w || !r || r <= 0) return null;
  if (r === 1) return w.toFixed(1);
  return (w * (1 + r / 30)).toFixed(1);
}

export default function RecordScreen() {
  const {
    title, note, routineId, sessionActive, sessionStartTime,
    exercises, setTitle, setNote,
    addExercise, removeExercise, addSet, removeSet,
    updateSet, toggleSetComplete, updateExerciseNote,
    startSession, endSession, reset,
  } = useWorkoutStore();
  const { bodyParts } = useLibraryStore();
  const { addRoutine, updateRoutine } = useRoutineStore();

  const [elapsed, setElapsed] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [prs, setPRs] = useState<Record<string, number>>({});

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 세션 활성 상태가 바뀔 때마다 타이머 동기화
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sessionActive && sessionStartTime) {
      const tick = () => setElapsed(Math.floor((Date.now() - sessionStartTime) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [sessionActive, sessionStartTime]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useFocusEffect(
    useCallback(() => {
      getPRs().then(setPRs);
    }, [])
  );

  async function finishSession() {
    if (exercises.length === 0) { Alert.alert('운동을 추가해주세요'); return; }
    const valid = exercises.every(e => e.sets.every(s => s.weight && s.reps));
    if (!valid) { Alert.alert('모든 세트의 무게와 횟수를 입력해주세요'); return; }

    const duration = elapsed;
    const today = new Date().toISOString().split('T')[0];
    const finalTitle = title.trim() || `운동 ${today}`;

    await saveWorkout(
      finalTitle, today,
      exercises.map(e => ({
        name: e.name,
        note: e.note || undefined,
        sets: e.sets.map(s => ({
          weight: parseFloat(s.weight),
          reps: parseInt(s.reps, 10),
        })),
      })),
      duration,
      note.trim() || undefined
    );

    Alert.alert('운동 완료! 💪', `총 ${fmtElapsed(duration)} 운동했어요.`);
    await sendNotification('운동 완료! 💪', '운동이 완료되었어요! 기록이 저장소에 저장됩니다.');

    reset();
    getPRs().then(setPRs);
  }

  const alreadySelected = exercises.map(e => e.exerciseId);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0f0f0f' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <WorkoutTimer />

      {/* 헤더 */}
      <View style={styles.header}>
        <View style={{ width: 80 }} />
        <Text style={styles.headerTitle}>운동 기록</Text>
        {sessionActive ? (
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

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* 제목 */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="운동 제목 (예: 가슴 운동)"
          placeholderTextColor="#555"
        />

        {exercises.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>아래 버튼으로 운동을 추가해보세요</Text>
          </View>
        )}

        {/* 운동 카드 */}
        {exercises.map(ex => {
          const lastSet = ex.sets[ex.sets.length - 1];
          const oneRM = calcOneRM(lastSet.weight, lastSet.reps);
          const isPR = lastSet.weight && prs[ex.name] &&
            parseFloat(lastSet.weight) > prs[ex.name];
          const completedCount = ex.sets.filter(s => s.completed).length;

          return (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    {isPR && <Text style={styles.prBadge}>🏆 PR</Text>}
                  </View>
                  <Text style={styles.bpLabel}>
                    {bodyParts.find(b => b.id === ex.bodyPart)?.name ?? ex.bodyPart}
                    {' · '}{completedCount}/{ex.sets.length} 세트 완료
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.setRow}>
                <View style={{ width: 28 }} />
                <Text style={[styles.setLabel, { width: 32 }]}>세트</Text>
                <Text style={[styles.setLabel, { flex: 1 }]}>무게 (kg)</Text>
                <Text style={[styles.setLabel, { flex: 1 }]}>횟수</Text>
                <View style={{ width: 28 }} />
              </View>

              {ex.sets.map((set, sIdx) => (
                <View key={sIdx} style={[styles.setRow, set.completed && styles.setRowDone]}>
                  {/* 완료 체크박스 */}
                  <TouchableOpacity
                    style={[styles.checkbox, set.completed && styles.checkboxOn]}
                    onPress={() => toggleSetComplete(ex.id, sIdx)}
                  >
                    {set.completed && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                  <Text style={[styles.setNum, { width: 32 }]}>{sIdx + 1}</Text>
                  <TextInput
                    style={[styles.setInput, { flex: 1, marginRight: 8 }, set.completed && styles.setInputDone]}
                    placeholder="0" placeholderTextColor="#555"
                    keyboardType="numeric" value={set.weight}
                    onChangeText={v => updateSet(ex.id, sIdx, 'weight', v)}
                    editable={!set.completed}
                  />
                  <TextInput
                    style={[styles.setInput, { flex: 1 }, set.completed && styles.setInputDone]}
                    placeholder="0" placeholderTextColor="#555"
                    keyboardType="numeric" value={set.reps}
                    onChangeText={v => updateSet(ex.id, sIdx, 'reps', v)}
                    editable={!set.completed}
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

              <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ex.id)}>
                  <Text style={styles.addSetBtnText}>+ 세트 추가</Text>
                </TouchableOpacity>
                {oneRM && (
                  <Text style={styles.oneRM}>예상 1RM: {oneRM} kg</Text>
                )}
              </View>

              <TextInput
                style={styles.exNoteInput}
                value={ex.note}
                onChangeText={v => updateExerciseNote(ex.id, v)}
                placeholder="메모 (예: 그립 넓게, 느리게 내리기)"
                placeholderTextColor="#444"
                multiline
              />
            </View>
          );
        })}

        {/* + 운동 추가 (세션 시작 후에만 표시) */}
        {sessionActive ? (
          <TouchableOpacity style={styles.addExBtn} onPress={() => setPickerVisible(true)}>
            <Text style={styles.addExBtnText}>+ 운동 추가</Text>
          </TouchableOpacity>
        ) : exercises.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>운동 시작 후 종목을 추가할 수 있어요</Text>
          </View>
        ) : null}

        {/* 메모 */}
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="운동 메모 (컨디션, 특이사항 등)"
          placeholderTextColor="#555"
          multiline
        />

        {/* 운동 시작 */}
        {!sessionActive && (
          <TouchableOpacity style={styles.startBtn} onPress={() => startSession()}>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: HEADER_TOP, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  elapsed: { color: '#4CAF50', fontSize: 16, fontWeight: '700' },
  doneBtn: {
    backgroundColor: '#6C63FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  content: { padding: 20, paddingBottom: 60 },

  titleInput: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 20,
    borderWidth: 1, borderColor: '#2a2a2a',
  },

  emptyBox: {
    padding: 40, alignItems: 'center', borderRadius: 12,
    borderWidth: 1, borderColor: '#2a2a2a', borderStyle: 'dashed', marginBottom: 16,
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
  prBadge: { fontSize: 12, marginLeft: 6, color: '#FFD700' },
  bpLabel: { color: '#6C63FF', fontSize: 12, marginTop: 2 },
  deleteBtn: { color: '#ff4444', fontSize: 16, paddingLeft: 12 },

  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  setRowDone: { opacity: 0.45 },
  setLabel: { color: '#666', fontSize: 12, textAlign: 'center' },
  setNum: { color: '#888', fontSize: 14, textAlign: 'center' },
  setInput: {
    backgroundColor: '#252525', borderRadius: 8, padding: 10,
    color: '#fff', fontSize: 15, textAlign: 'center',
  },
  setInputDone: { backgroundColor: '#1c1c1c' },

  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
  checkboxOn: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 4,
  },
  addSetBtn: { alignSelf: 'flex-start' },
  addSetBtnText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },
  oneRM: { color: '#888', fontSize: 12 },

  exNoteInput: {
    marginTop: 10,
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 10,
    color: '#bbb',
    fontSize: 13,
    minHeight: 36,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#333',
  },

  addExBtn: {
    borderWidth: 1.5, borderColor: '#6C63FF', borderStyle: 'dashed',
    borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12,
  },
  addExBtnText: { color: '#6C63FF', fontSize: 16, fontWeight: '600' },

  noteInput: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 14, minHeight: 60,
    borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 12,
    textAlignVertical: 'top',
  },

  startBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14, padding: 18, alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
