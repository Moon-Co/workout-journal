import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useWorkoutStore } from '@/store/workoutStore';
import { useLibraryStore } from '@/store/libraryStore';
import { saveWorkout } from '@/db/database';
import ExercisePicker from '@/components/ExercisePicker';
import WorkoutTimer from '@/components/WorkoutTimer';

export default function RecordScreen() {
  const { title, exercises, setTitle, addExercise, removeExercise, addSet, removeSet, updateSet, reset } = useWorkoutStore();
  const { bodyParts } = useLibraryStore();
  const [pickerVisible, setPickerVisible] = useState(false);

  const alreadySelected = exercises.map((e) => e.exerciseId);

  function getBodyPartName(id: string) {
    return bodyParts.find((b) => b.id === id)?.name ?? id;
  }

  async function handleSave() {
    if (!title.trim()) { Alert.alert('제목을 입력해주세요'); return; }
    if (exercises.length === 0) { Alert.alert('운동을 추가해주세요'); return; }
    const valid = exercises.every((e) => e.sets.every((s) => s.weight && s.reps));
    if (!valid) { Alert.alert('모든 세트의 무게와 횟수를 입력해주세요'); return; }

    const today = new Date().toISOString().split('T')[0];
    await saveWorkout(
      title.trim(),
      today,
      exercises.map((e) => ({
        name: e.name,
        sets: e.sets.map((s) => ({ weight: parseFloat(s.weight), reps: parseInt(s.reps, 10) })),
      }))
    );
    Alert.alert('저장 완료!', `"${title}" 운동이 저장됐어요.`);
    reset();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <WorkoutTimer />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.header}>운동 기록</Text>

        {/* 운동 제목 */}
        <TextInput
          style={styles.titleInput}
          placeholder="운동 제목 (예: 가슴 운동)"
          placeholderTextColor="#555"
          value={title}
          onChangeText={setTitle}
        />

        {/* 운동 목록 */}
        {exercises.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>아래 버튼으로 운동을 추가해보세요</Text>
          </View>
        ) : (
          exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              {/* 운동명 + 부위 */}
              <View style={styles.exerciseHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.bodyPartLabel}>{getBodyPartName(exercise.bodyPart)}</Text>
                </View>
                <TouchableOpacity onPress={() => removeExercise(exercise.id)}>
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

              {/* 세트 입력 */}
              {exercise.sets.map((set, sIdx) => (
                <View key={sIdx} style={styles.setRow}>
                  <Text style={[styles.setNum, { width: 32 }]}>{sIdx + 1}</Text>
                  <TextInput
                    style={[styles.setInput, { flex: 1, marginRight: 8 }]}
                    placeholder="0"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={set.weight}
                    onChangeText={(v) => updateSet(exercise.id, sIdx, 'weight', v)}
                  />
                  <TextInput
                    style={[styles.setInput, { flex: 1 }]}
                    placeholder="0"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={set.reps}
                    onChangeText={(v) => updateSet(exercise.id, sIdx, 'reps', v)}
                  />
                  {exercise.sets.length > 1 ? (
                    <TouchableOpacity style={{ width: 28, alignItems: 'center' }} onPress={() => removeSet(exercise.id, sIdx)}>
                      <Text style={styles.deleteBtn}>✕</Text>
                    </TouchableOpacity>
                  ) : <View style={{ width: 28 }} />}
                </View>
              ))}

              <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exercise.id)}>
                <Text style={styles.addSetBtnText}>+ 세트 추가</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* 운동 추가 버튼 */}
        <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setPickerVisible(true)}>
          <Text style={styles.addExerciseBtnText}>+ 운동 추가</Text>
        </TouchableOpacity>

        {/* 저장 */}
        {exercises.length > 0 && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>저장하기</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        alreadySelected={alreadySelected}
        onSelect={(picked) => {
          picked.forEach((ex) => addExercise(ex.id, ex.name, ex.bodyPartId));
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 20, paddingBottom: 60 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, marginTop: 50 },

  titleInput: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 20,
    borderWidth: 1, borderColor: '#2a2a2a',
  },

  emptyBox: {
    padding: 32, alignItems: 'center', borderRadius: 12,
    borderWidth: 1, borderColor: '#2a2a2a', borderStyle: 'dashed', marginBottom: 16,
  },
  emptyText: { color: '#555', fontSize: 15 },

  exerciseCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a',
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  exerciseName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  bodyPartLabel: { color: '#6C63FF', fontSize: 12, marginTop: 2 },
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

  addExerciseBtn: {
    borderWidth: 1.5, borderColor: '#6C63FF', borderStyle: 'dashed',
    borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16,
  },
  addExerciseBtnText: { color: '#6C63FF', fontSize: 16, fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#6C63FF', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
