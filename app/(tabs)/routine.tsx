import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, TextInput, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useRoutineStore, Routine, RoutineExercise } from '@/store/routineStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useWorkoutStore } from '@/store/workoutStore';

export default function RoutineScreen() {
  const { routines, addRoutine, deleteRoutine } = useRoutineStore();
  const { bodyParts, exercises: library } = useLibraryStore();
  const { reset, setTitle, addExercise, setRoutineId, startSession } = useWorkoutStore();

  const [createModal, setCreateModal] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [selectedExIds, setSelectedExIds] = useState<string[]>([]);
  const [selectedBPId, setSelectedBPId] = useState(bodyParts[0]?.id ?? '');

  function toggleEx(id: string) {
    setSelectedExIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function handleCreate() {
    if (!routineName.trim()) { Alert.alert('루틴 이름을 입력해주세요'); return; }
    if (selectedExIds.length === 0) { Alert.alert('운동을 선택해주세요'); return; }
    const exercises: RoutineExercise[] = library
      .filter(e => selectedExIds.includes(e.id))
      .map(e => ({ exerciseId: e.id, name: e.name, bodyPartId: e.bodyPartId, defaultSets: 3 }));
    addRoutine(routineName.trim(), exercises);
    setRoutineName('');
    setSelectedExIds([]);
    setCreateModal(false);
  }

  function handleStart(routine: Routine) {
    reset();
    setTitle(routine.name);
    setRoutineId(routine.id);
    routine.exercises.forEach(e => {
      addExercise(e.exerciseId, e.name, e.bodyPartId);
    });
    startSession(); // 세션 자동 시작
    router.push('/(tabs)/record');
  }

  function handleDelete(id: string, name: string) {
    Alert.alert('루틴 삭제', `"${name}"을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteRoutine(id) },
    ]);
  }

  const bpExercises = library.filter(e => e.bodyPartId === selectedBPId);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>루틴 관리</Text>

        {routines.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>저장된 루틴이 없어요</Text>
            <Text style={styles.emptySub}>자주 하는 운동을 루틴으로 저장해보세요</Text>
          </View>
        ) : (
          routines.map(routine => (
            <View key={routine.id} style={styles.routineCard}>
              <View style={styles.routineHeader}>
                <Text style={styles.routineName}>{routine.name}</Text>
                <TouchableOpacity onPress={() => handleDelete(routine.id, routine.name)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.routineExCount}>
                {routine.exercises.length}개 종목
                {' · '}
                {routine.exercises.map(e => e.name).join(', ')}
              </Text>
              <TouchableOpacity style={styles.startBtn} onPress={() => handleStart(routine)}>
                <Text style={styles.startBtnText}>이 루틴으로 시작 🔥</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* 루틴 만들기 버튼 */}
      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabBtn} onPress={() => setCreateModal(true)}>
          <Text style={styles.fabBtnText}>+ 새 루틴 만들기</Text>
        </TouchableOpacity>
      </View>

      {/* 루틴 생성 모달 */}
      <Modal visible={createModal} animationType="slide" onRequestClose={() => setCreateModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCreateModal(false)}>
              <Text style={styles.modalCancel}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>새 루틴</Text>
            <TouchableOpacity onPress={handleCreate}>
              <Text style={styles.modalSave}>저장</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            {/* 루틴 이름 */}
            <TextInput
              style={styles.nameInput}
              placeholder="루틴 이름 (예: 가슴/어깨 루틴)"
              placeholderTextColor="#555"
              value={routineName}
              onChangeText={setRoutineName}
            />

            {/* 부위 탭 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bpScroll}>
              <View style={styles.bpRow}>
                {bodyParts.map(bp => (
                  <TouchableOpacity
                    key={bp.id}
                    style={[styles.bpChip, selectedBPId === bp.id && styles.bpChipActive]}
                    onPress={() => setSelectedBPId(bp.id)}
                  >
                    <Text style={[styles.bpChipText, selectedBPId === bp.id && styles.bpChipTextActive]}>
                      {bp.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* 운동 목록 */}
            <Text style={styles.selectLabel}>
              선택된 운동: {selectedExIds.length}개
            </Text>
            {bpExercises.map(ex => (
              <TouchableOpacity
                key={ex.id}
                style={[styles.exRow, selectedExIds.includes(ex.id) && styles.exRowActive]}
                onPress={() => toggleEx(ex.id)}
              >
                <View style={[styles.checkbox, selectedExIds.includes(ex.id) && styles.checkboxOn]}>
                  {selectedExIds.includes(ex.id) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.exName, selectedExIds.includes(ex.id) && styles.exNameActive]}>
                  {ex.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 20 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#555', fontSize: 17, fontWeight: '600', marginBottom: 8 },
  emptySub: { color: '#444', fontSize: 13 },

  routineCard: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#2a2a2a',
  },
  routineHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  routineName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  deleteBtn: { color: '#ff4444', fontSize: 16 },
  routineExCount: { color: '#666', fontSize: 13, marginBottom: 14 },
  startBtn: {
    backgroundColor: '#6C63FF', borderRadius: 10, padding: 12, alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  fab: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32, backgroundColor: '#0f0f0f',
    borderTopWidth: 1, borderTopColor: '#1a1a1a',
  },
  fabBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14, padding: 16, alignItems: 'center',
  },
  fabBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  modalContainer: { flex: 1, backgroundColor: '#0f0f0f' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalCancel: { color: '#888', fontSize: 16 },
  modalSave: { color: '#6C63FF', fontSize: 16, fontWeight: '700' },

  nameInput: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 17, fontWeight: '600',
    borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 16,
  },

  bpScroll: { marginBottom: 4 },
  bpRow: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  bpChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  bpChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  bpChipText: { color: '#888', fontSize: 14 },
  bpChipTextActive: { color: '#fff', fontWeight: '600' },

  selectLabel: { color: '#6C63FF', fontSize: 13, fontWeight: '600', marginBottom: 8 },

  exRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  exRowActive: { backgroundColor: '#1e1c38', marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkboxOn: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  exName: { color: '#bbb', fontSize: 15 },
  exNameActive: { color: '#fff', fontWeight: '600' },
});
