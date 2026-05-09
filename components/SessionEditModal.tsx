import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { WorkoutSession } from '@/db/database';

type Props = {
  session: WorkoutSession;
  onSave: (updated: WorkoutSession) => void;
  onClose: () => void;
};

type EditableSet = { weight: string; reps: string };
type EditableExercise = { name: string; sets: EditableSet[] };

function toEditable(session: WorkoutSession): { title: string; exercises: EditableExercise[] } {
  return {
    title: session.title,
    exercises: session.exercises.map((e) => ({
      name: e.name,
      sets: e.sets.map((s) => ({ weight: String(s.weight), reps: String(s.reps) })),
    })),
  };
}

export default function SessionEditModal({ session, onSave, onClose }: Props) {
  const [title, setTitle] = useState(session.title);
  const [exercises, setExercises] = useState<EditableExercise[]>(
    () => toEditable(session).exercises
  );

  function updateSet(eIdx: number, sIdx: number, field: 'weight' | 'reps', value: string) {
    setExercises((prev) =>
      prev.map((e, ei) =>
        ei === eIdx
          ? { ...e, sets: e.sets.map((s, si) => (si === sIdx ? { ...s, [field]: value } : s)) }
          : e
      )
    );
  }

  function addSet(eIdx: number) {
    setExercises((prev) =>
      prev.map((e, ei) =>
        ei === eIdx ? { ...e, sets: [...e.sets, { weight: '', reps: '' }] } : e
      )
    );
  }

  function removeSet(eIdx: number, sIdx: number) {
    setExercises((prev) =>
      prev.map((e, ei) =>
        ei === eIdx ? { ...e, sets: e.sets.filter((_, si) => si !== sIdx) } : e
      )
    );
  }

  function removeExercise(eIdx: number) {
    setExercises((prev) => prev.filter((_, ei) => ei !== eIdx));
  }

  function handleSave() {
    if (!title.trim()) { Alert.alert('제목을 입력해주세요'); return; }
    if (exercises.length === 0) { Alert.alert('운동을 1개 이상 추가해주세요'); return; }
    const valid = exercises.every((e) => e.sets.every((s) => s.weight && s.reps));
    if (!valid) { Alert.alert('모든 세트의 무게와 횟수를 입력해주세요'); return; }

    onSave({
      ...session,
      title: title.trim(),
      exercises: exercises.map((e) => ({
        name: e.name,
        sets: e.sets.map((s) => ({
          weight: parseFloat(s.weight),
          reps: parseInt(s.reps, 10),
        })),
      })),
    });
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelBtn}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>기록 수정</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveBtn}>저장</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* 날짜 (읽기 전용) */}
            <Text style={styles.dateLabel}>{session.date}</Text>

            {/* 제목 */}
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="운동 제목"
              placeholderTextColor="#555"
            />

            {/* 운동 목록 */}
            {exercises.map((exercise, eIdx) => (
              <View key={eIdx} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <TouchableOpacity onPress={() => removeExercise(eIdx)}>
                    <Text style={styles.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* 세트 헤더 */}
                <View style={styles.setRow}>
                  <Text style={[styles.setLabel, { width: 32 }]}>세트</Text>
                  <Text style={[styles.setLabel, { flex: 1 }]}>무게 (kg)</Text>
                  <Text style={[styles.setLabel, { flex: 1 }]}>횟수</Text>
                  <View style={{ width: 28 }} />
                </View>

                {/* 세트 행 */}
                {exercise.sets.map((set, sIdx) => (
                  <View key={sIdx} style={styles.setRow}>
                    <Text style={[styles.setNum, { width: 32 }]}>{sIdx + 1}</Text>
                    <TextInput
                      style={[styles.setInput, { flex: 1, marginRight: 8 }]}
                      value={set.weight}
                      onChangeText={(v) => updateSet(eIdx, sIdx, 'weight', v)}
                      placeholder="0"
                      placeholderTextColor="#555"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.setInput, { flex: 1 }]}
                      value={set.reps}
                      onChangeText={(v) => updateSet(eIdx, sIdx, 'reps', v)}
                      placeholder="0"
                      placeholderTextColor="#555"
                      keyboardType="numeric"
                    />
                    {exercise.sets.length > 1 ? (
                      <TouchableOpacity style={{ width: 28, alignItems: 'center' }} onPress={() => removeSet(eIdx, sIdx)}>
                        <Text style={styles.deleteBtn}>✕</Text>
                      </TouchableOpacity>
                    ) : <View style={{ width: 28 }} />}
                  </View>
                ))}

                <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(eIdx)}>
                  <Text style={styles.addSetBtnText}>+ 세트 추가</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelBtn: { color: '#888', fontSize: 16 },
  saveBtn: { color: '#6C63FF', fontSize: 16, fontWeight: '700' },

  content: { padding: 20, paddingBottom: 60 },
  dateLabel: { color: '#555', fontSize: 13, marginBottom: 10 },

  titleInput: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 20,
    borderWidth: 1, borderColor: '#2a2a2a',
  },

  exerciseCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a',
  },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exerciseName: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
});
