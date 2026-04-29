import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Alert,
} from 'react-native';
import { useLibraryStore, Exercise } from '@/store/libraryStore';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercises: Exercise[]) => void;
  alreadySelected: string[];
};

export default function ExercisePicker({ visible, onClose, onSelect, alreadySelected }: Props) {
  const { bodyParts, exercises, addBodyPart, deleteBodyPart, addExercise, deleteExercise } = useLibraryStore();

  const [selectedBodyPart, setSelectedBodyPart] = useState(bodyParts[0]?.id ?? '');
  const [selected, setSelected] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [newBodyPartName, setNewBodyPartName] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [showAddBodyPart, setShowAddBodyPart] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);

  const filtered = exercises.filter((e) => e.bodyPartId === selectedBodyPart);

  function toggleSelect(id: string) {
    if (alreadySelected.includes(id)) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleConfirm() {
    const picked = exercises.filter((e) => selected.includes(e.id));
    onSelect(picked);
    setSelected([]);
    onClose();
  }

  function handleAddBodyPart() {
    if (!newBodyPartName.trim()) return;
    addBodyPart(newBodyPartName.trim());
    setNewBodyPartName('');
    setShowAddBodyPart(false);
  }

  function handleAddExercise() {
    if (!newExerciseName.trim()) return;
    addExercise(selectedBodyPart, newExerciseName.trim());
    setNewExerciseName('');
    setShowAddExercise(false);
  }

  function handleDeleteBodyPart(id: string) {
    Alert.alert('부위 삭제', '해당 부위의 운동도 모두 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: () => {
          deleteBodyPart(id);
          setSelectedBodyPart(bodyParts.find((b) => b.id !== id)?.id ?? '');
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>닫기</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>운동 선택</Text>
          <TouchableOpacity onPress={() => setEditMode((v) => !v)}>
            <Text style={[styles.editBtn, editMode && { color: '#6C63FF' }]}>
              {editMode ? '완료' : '편집'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 부위 탭 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bodyPartScroll} contentContainerStyle={styles.bodyPartContent}>
          {bodyParts.map((bp) => (
            <View key={bp.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.bodyPartChip, selectedBodyPart === bp.id && styles.bodyPartChipActive]}
                onPress={() => setSelectedBodyPart(bp.id)}
              >
                <Text style={[styles.bodyPartChipText, selectedBodyPart === bp.id && styles.bodyPartChipTextActive]}>
                  {bp.name}
                </Text>
              </TouchableOpacity>
              {editMode && (
                <TouchableOpacity onPress={() => handleDeleteBodyPart(bp.id)} style={styles.deleteChip}>
                  <Text style={styles.deleteChipText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addChip} onPress={() => setShowAddBodyPart(true)}>
            <Text style={styles.addChipText}>+ 부위</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 부위 추가 인풋 */}
        {showAddBodyPart && (
          <View style={styles.inlineAdd}>
            <TextInput
              style={styles.inlineInput}
              placeholder="부위 이름"
              placeholderTextColor="#555"
              value={newBodyPartName}
              onChangeText={setNewBodyPartName}
              autoFocus
            />
            <TouchableOpacity style={styles.inlineAddBtn} onPress={handleAddBodyPart}>
              <Text style={styles.inlineAddBtnText}>추가</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddBodyPart(false)} style={{ padding: 8 }}>
              <Text style={{ color: '#666' }}>취소</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 운동 목록 */}
        <ScrollView style={styles.exerciseList} contentContainerStyle={{ paddingBottom: 120 }}>
          {filtered.map((ex) => {
            const isAlready = alreadySelected.includes(ex.id);
            const isSelected = selected.includes(ex.id);
            return (
              <View key={ex.id} style={styles.exerciseRow}>
                <TouchableOpacity
                  style={[styles.exerciseItem, isAlready && styles.exerciseItemDisabled]}
                  onPress={() => toggleSelect(ex.id)}
                  disabled={isAlready}
                >
                  <View style={[styles.checkbox, (isSelected || isAlready) && styles.checkboxChecked]}>
                    {(isSelected || isAlready) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.exerciseName, isAlready && { color: '#555' }]}>
                    {ex.name}
                  </Text>
                  {isAlready && <Text style={styles.alreadyBadge}>추가됨</Text>}
                </TouchableOpacity>
                {editMode && (
                  <TouchableOpacity onPress={() => deleteExercise(ex.id)} style={styles.deleteExercise}>
                    <Text style={styles.deleteChipText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* 운동 추가 */}
          {showAddExercise ? (
            <View style={styles.inlineAdd}>
              <TextInput
                style={styles.inlineInput}
                placeholder="운동 이름"
                placeholderTextColor="#555"
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                autoFocus
              />
              <TouchableOpacity style={styles.inlineAddBtn} onPress={handleAddExercise}>
                <Text style={styles.inlineAddBtnText}>추가</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddExercise(false)} style={{ padding: 8 }}>
                <Text style={{ color: '#666' }}>취소</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addExerciseRow} onPress={() => setShowAddExercise(true)}>
              <Text style={styles.addExerciseText}>+ 운동 추가</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* 확인 버튼 */}
        {selected.length > 0 && (
          <View style={styles.confirmBar}>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>선택 완료 ({selected.length})</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#1e1e1e',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  closeBtn: { color: '#aaa', fontSize: 16 },
  editBtn: { color: '#aaa', fontSize: 16 },

  bodyPartScroll: { maxHeight: 56, borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  bodyPartContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  bodyPartChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a',
  },
  bodyPartChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  bodyPartChipText: { color: '#888', fontSize: 14 },
  bodyPartChipTextActive: { color: '#fff', fontWeight: '600' },
  deleteChip: { marginLeft: 2, padding: 4 },
  deleteChipText: { color: '#ff4444', fontSize: 12 },
  addChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#6C63FF', borderStyle: 'dashed',
  },
  addChipText: { color: '#6C63FF', fontSize: 14 },

  inlineAdd: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1a1a1a',
  },
  inlineInput: {
    flex: 1, backgroundColor: '#252525', borderRadius: 8,
    padding: 10, color: '#fff', marginRight: 8,
  },
  inlineAddBtn: { backgroundColor: '#6C63FF', borderRadius: 8, padding: 10 },
  inlineAddBtnText: { color: '#fff', fontWeight: '600' },

  exerciseList: { flex: 1 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center' },
  exerciseItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  exerciseItemDisabled: { opacity: 0.5 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkboxChecked: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  exerciseName: { flex: 1, color: '#fff', fontSize: 16 },
  alreadyBadge: { color: '#555', fontSize: 12 },
  deleteExercise: { padding: 16 },

  addExerciseRow: {
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  addExerciseText: { color: '#6C63FF', fontSize: 16 },

  confirmBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 34, backgroundColor: '#0f0f0f',
    borderTopWidth: 1, borderTopColor: '#1e1e1e',
  },
  confirmBtn: {
    backgroundColor: '#6C63FF', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
