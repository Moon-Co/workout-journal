import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useWorkoutStore } from '@/store/workoutStore';
import { useLibraryStore } from '@/store/libraryStore';
import { saveWorkout } from '@/db/database';
import WorkoutTimer from '@/components/WorkoutTimer';

type Step = 1 | 2 | 3;
const STEP_LABELS = ['부위', '운동', '기록'];

export default function RecordScreen() {
  const {
    title, exercises, setTitle,
    addExercise, removeExercise, addSet, removeSet, updateSet, reset,
  } = useWorkoutStore();
  const {
    bodyParts, exercises: library,
    addBodyPart, deleteBodyPart,
    addExercise: addLibExercise, deleteExercise,
  } = useLibraryStore();

  const [step, setStep] = useState<Step>(1);
  const [selectedBPIds, setSelectedBPIds] = useState<string[]>([]);
  const [selectedExIds, setSelectedExIds] = useState<string[]>([]);

  // 라이브러리 편집
  const [editingBP, setEditingBP] = useState(false);
  const [showAddBP, setShowAddBP] = useState(false);
  const [newBPName, setNewBPName] = useState('');
  const [addingExForBP, setAddingExForBP] = useState<string | null>(null);
  const [newExName, setNewExName] = useState('');

  // ── 부위 토글 (해제 시 해당 부위 운동도 선택 해제) ──
  function toggleBP(id: string) {
    if (selectedBPIds.includes(id)) {
      const exIds = library.filter(e => e.bodyPartId === id).map(e => e.id);
      setSelectedBPIds(prev => prev.filter(x => x !== id));
      setSelectedExIds(prev => prev.filter(x => !exIds.includes(x)));
    } else {
      setSelectedBPIds(prev => [...prev, id]);
    }
  }

  function toggleEx(id: string) {
    setSelectedExIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function handleDeleteBP(id: string) {
    Alert.alert('부위 삭제', '해당 부위의 운동도 모두 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: () => {
          deleteBodyPart(id);
          setSelectedBPIds(prev => prev.filter(x => x !== id));
        },
      },
    ]);
  }

  function handleAddBP() {
    if (!newBPName.trim()) return;
    addBodyPart(newBPName.trim());
    setNewBPName('');
    setShowAddBP(false);
  }

  function handleAddEx(bpId: string) {
    if (!newExName.trim()) return;
    addLibExercise(bpId, newExName.trim());
    setNewExName('');
    setAddingExForBP(null);
  }

  // ── 단계 이동 ──
  function goStep2() {
    if (selectedBPIds.length === 0) { Alert.alert('부위를 선택해주세요'); return; }
    setEditingBP(false);
    setStep(2);
  }

  function goStep3() {
    if (selectedExIds.length === 0) { Alert.alert('운동을 선택해주세요'); return; }
    reset();
    const bpNames = bodyParts
      .filter(bp => selectedBPIds.includes(bp.id))
      .map(bp => bp.name);
    setTitle(bpNames.join('/') + ' 운동');
    library
      .filter(e => selectedExIds.includes(e.id))
      .forEach(e => addExercise(e.id, e.name, e.bodyPartId));
    setStep(3);
  }

  function goBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  function fullReset() {
    reset();
    setStep(1);
    setSelectedBPIds([]);
    setSelectedExIds([]);
    setEditingBP(false);
  }

  async function handleSave() {
    if (!title.trim()) { Alert.alert('제목을 입력해주세요'); return; }
    if (exercises.length === 0) { Alert.alert('운동을 추가해주세요'); return; }
    const valid = exercises.every(e => e.sets.every(s => s.weight && s.reps));
    if (!valid) { Alert.alert('모든 세트의 무게와 횟수를 입력해주세요'); return; }

    const today = new Date().toISOString().split('T')[0];
    await saveWorkout(
      title.trim(),
      today,
      exercises.map(e => ({
        name: e.name,
        sets: e.sets.map(s => ({
          weight: parseFloat(s.weight),
          reps: parseInt(s.reps, 10),
        })),
      }))
    );
    Alert.alert('저장 완료!', `"${title}" 운동이 저장됐어요.`);
    fullReset();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0f0f0f' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <WorkoutTimer />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 스텝 인디케이터 ── */}
        <View style={styles.stepBar}>
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <View key={i} style={styles.stepItem}>
                {i > 0 && (
                  <View style={[styles.stepLine, done && styles.stepLineDone]} />
                )}
                <View style={[styles.stepDot, (active || done) && styles.stepDotOn]}>
                  <Text style={[styles.stepDotText, (active || done) && styles.stepDotTextOn]}>
                    {done ? '✓' : n}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 이전 버튼 */}
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Text style={styles.backBtnText}>← 이전</Text>
          </TouchableOpacity>
        )}

        {/* ════════════════════════════════
            STEP 1 — 부위 선택
        ════════════════════════════════ */}
        {step === 1 && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.stepTitle}>어떤 부위를 운동할까요?</Text>
                <Text style={styles.stepSub}>복수 선택 가능</Text>
              </View>
              <TouchableOpacity
                onPress={() => { setEditingBP(v => !v); setShowAddBP(false); }}
              >
                <Text style={[styles.editToggle, editingBP && styles.editToggleOn]}>
                  {editingBP ? '완료' : '편집'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chipGrid}>
              {bodyParts.map(bp => (
                <View key={bp.id} style={styles.chipWrapper}>
                  <TouchableOpacity
                    style={[styles.chip, selectedBPIds.includes(bp.id) && styles.chipActive]}
                    onPress={() => toggleBP(bp.id)}
                  >
                    <Text style={[styles.chipText, selectedBPIds.includes(bp.id) && styles.chipTextActive]}>
                      {bp.name}
                    </Text>
                  </TouchableOpacity>
                  {editingBP && (
                    <TouchableOpacity
                      style={styles.chipDeleteBtn}
                      onPress={() => handleDeleteBP(bp.id)}
                    >
                      <Text style={styles.chipDeleteText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {editingBP && (
              showAddBP ? (
                <View style={styles.inlineAdd}>
                  <TextInput
                    style={styles.inlineInput}
                    placeholder="부위 이름"
                    placeholderTextColor="#555"
                    value={newBPName}
                    onChangeText={setNewBPName}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.inlineBtn} onPress={handleAddBP}>
                    <Text style={styles.inlineBtnText}>추가</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowAddBP(false)} style={styles.inlineCancelBtn}>
                    <Text style={styles.inlineCancelText}>취소</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addRowBtn} onPress={() => setShowAddBP(true)}>
                  <Text style={styles.addRowBtnText}>+ 부위 추가</Text>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, selectedBPIds.length === 0 && styles.primaryBtnOff]}
              onPress={goStep2}
            >
              <Text style={styles.primaryBtnText}>
                다음{selectedBPIds.length > 0 ? `  (${selectedBPIds.length}개 선택)` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ════════════════════════════════
            STEP 2 — 운동 선택
        ════════════════════════════════ */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>운동을 선택해주세요</Text>
            <Text style={styles.stepSub}>복수 선택 가능</Text>

            {selectedBPIds.map(bpId => {
              const bp = bodyParts.find(b => b.id === bpId);
              const bpExercises = library.filter(e => e.bodyPartId === bpId);
              if (!bp) return null;

              return (
                <View key={bpId} style={styles.exGroup}>
                  <Text style={styles.groupLabel}>{bp.name}</Text>

                  {bpExercises.map(ex => (
                    <TouchableOpacity
                      key={ex.id}
                      style={[styles.exRow, selectedExIds.includes(ex.id) && styles.exRowActive]}
                      onPress={() => toggleEx(ex.id)}
                    >
                      <View style={[styles.checkbox, selectedExIds.includes(ex.id) && styles.checkboxOn]}>
                        {selectedExIds.includes(ex.id) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                      <Text style={[styles.exName, selectedExIds.includes(ex.id) && styles.exNameActive]}>
                        {ex.name}
                      </Text>
                      {selectedExIds.includes(ex.id) && (
                        <TouchableOpacity
                          onPress={() => deleteExercise(ex.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  ))}

                  {addingExForBP === bpId ? (
                    <View style={styles.inlineAdd}>
                      <TextInput
                        style={styles.inlineInput}
                        placeholder="운동 이름"
                        placeholderTextColor="#555"
                        value={newExName}
                        onChangeText={setNewExName}
                        autoFocus
                      />
                      <TouchableOpacity style={styles.inlineBtn} onPress={() => handleAddEx(bpId)}>
                        <Text style={styles.inlineBtnText}>추가</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setAddingExForBP(null)}
                        style={styles.inlineCancelBtn}
                      >
                        <Text style={styles.inlineCancelText}>취소</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addRowBtn}
                      onPress={() => { setAddingExForBP(bpId); setNewExName(''); }}
                    >
                      <Text style={styles.addRowBtnText}>+ 운동 추가</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.primaryBtn, selectedExIds.length === 0 && styles.primaryBtnOff]}
              onPress={goStep3}
            >
              <Text style={styles.primaryBtnText}>
                다음{selectedExIds.length > 0 ? `  (${selectedExIds.length}개 선택)` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ════════════════════════════════
            STEP 3 — 세트 입력
        ════════════════════════════════ */}
        {step === 3 && (
          <View>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="운동 제목"
              placeholderTextColor="#555"
            />

            {exercises.map(ex => (
              <View key={ex.id} style={styles.exerciseCard}>
                <View style={styles.exerciseCardHeader}>
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

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>저장하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 100, paddingBottom: 60 },

  // ── 스텝 인디케이터 ──
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepItem: { alignItems: 'center' },
  stepLine: {
    width: 48, height: 2,
    backgroundColor: '#2a2a2a', marginHorizontal: 4, marginBottom: 18,
  },
  stepLineDone: { backgroundColor: '#6C63FF' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1e1e1e', borderWidth: 2, borderColor: '#2a2a2a',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stepDotOn: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  stepDotText: { color: '#555', fontSize: 12, fontWeight: '700' },
  stepDotTextOn: { color: '#fff' },
  stepLabel: { color: '#555', fontSize: 11 },
  stepLabelActive: { color: '#fff', fontWeight: '600' },

  // ── 공통 ──
  backBtn: { marginBottom: 16 },
  backBtnText: { color: '#6C63FF', fontSize: 15 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  stepTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  stepSub: { color: '#555', fontSize: 13 },
  editToggle: { color: '#888', fontSize: 15, paddingTop: 4 },
  editToggleOn: { color: '#6C63FF' },

  // ── 부위 칩 ──
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  chipWrapper: { flexDirection: 'row', alignItems: 'center', marginRight: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 24, backgroundColor: '#1a1a1a',
    borderWidth: 1.5, borderColor: '#2a2a2a',
  },
  chipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  chipText: { color: '#888', fontSize: 15, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  chipDeleteBtn: { marginLeft: 4, padding: 4 },
  chipDeleteText: { color: '#ff4444', fontSize: 13 },

  // ── 인라인 추가 ──
  inlineAdd: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 10, marginBottom: 12,
  },
  inlineInput: {
    flex: 1, backgroundColor: '#252525', borderRadius: 8,
    padding: 10, color: '#fff', marginRight: 8,
  },
  inlineBtn: { backgroundColor: '#6C63FF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  inlineBtnText: { color: '#fff', fontWeight: '700' },
  inlineCancelBtn: { padding: 10 },
  inlineCancelText: { color: '#666' },

  addRowBtn: { paddingVertical: 10, marginBottom: 8 },
  addRowBtnText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },

  // ── 운동 선택 ──
  exGroup: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    borderWidth: 1, borderColor: '#2a2a2a',
    marginBottom: 14, overflow: 'hidden',
  },
  groupLabel: {
    color: '#6C63FF', fontSize: 13, fontWeight: '700',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  exRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: '#252525',
  },
  exRowActive: { backgroundColor: '#1e1c38' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checkboxOn: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  exName: { flex: 1, color: '#bbb', fontSize: 15 },
  exNameActive: { color: '#fff', fontWeight: '600' },

  // ── 공통 버튼 ──
  primaryBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  primaryBtnOff: { backgroundColor: '#2a2a2a' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── STEP 3 ──
  titleInput: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 20,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  exerciseCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a',
  },
  exerciseCardHeader: {
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

  saveBtn: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
