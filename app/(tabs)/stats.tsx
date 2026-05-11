import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/core';
import { getAllSessions, getPRs, exportAllData, importAllData, WorkoutSession } from '@/db/database';

function getWeekKey(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().split('T')[0];
}

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}분 ${s > 0 ? s + '초' : ''}` : `${s}초`;
}

export default function StatsScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<Record<string, number>>({});
  const [backupModal, setBackupModal] = useState(false);
  const [restoreModal, setRestoreModal] = useState(false);
  const [backupText, setBackupText] = useState('');
  const [restoreText, setRestoreText] = useState('');

  useFocusEffect(
    useCallback(() => {
      getAllSessions().then(setSessions);
      getPRs().then(setPRs);
    }, [])
  );

  // 주간 운동 횟수 (최근 8주)
  const weeklyMap: Record<string, number> = {};
  sessions.forEach(s => {
    const wk = getWeekKey(s.date);
    weeklyMap[wk] = (weeklyMap[wk] || 0) + 1;
  });
  const sortedWeeks = Object.keys(weeklyMap).sort().slice(-8);
  const maxCount = Math.max(...sortedWeeks.map(w => weeklyMap[w]), 1);

  // 이번 달 통계
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthSessions = sessions.filter(s => s.date.startsWith(thisMonth));
  const monthVolume = monthSessions.reduce((total, s) =>
    total + s.exercises.reduce((t, e) =>
      t + e.sets.reduce((st, set) => st + set.weight * set.reps, 0), 0), 0);
  const avgDuration = monthSessions.filter(s => s.duration).reduce((t, s) => t + (s.duration ?? 0), 0)
    / (monthSessions.filter(s => s.duration).length || 1);

  async function handleExport() {
    const data = await exportAllData();
    setBackupText(data);
    setBackupModal(true);
  }

  async function handleImport() {
    try {
      await importAllData(restoreText);
      Alert.alert('복원 완료', '데이터가 복원되었어요.');
      setRestoreModal(false);
      setRestoreText('');
      getAllSessions().then(setSessions);
      getPRs().then(setPRs);
    } catch {
      Alert.alert('오류', '올바른 JSON 형식이 아니에요.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>통계</Text>

      {/* 이번 달 요약 */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{monthSessions.length}</Text>
          <Text style={styles.summaryLabel}>이번 달 운동</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{monthVolume.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>볼륨 (kg)</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{sessions.length}</Text>
          <Text style={styles.summaryLabel}>전체 운동</Text>
        </View>
      </View>

      {monthSessions.some(s => s.duration) && (
        <View style={styles.avgCard}>
          <Text style={styles.avgLabel}>평균 운동 시간</Text>
          <Text style={styles.avgValue}>{fmtDuration(Math.round(avgDuration))}</Text>
        </View>
      )}

      {/* 주간 운동 횟수 바 차트 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>주간 운동 횟수 (최근 8주)</Text>
        {sortedWeeks.length === 0 ? (
          <Text style={styles.emptyText}>데이터가 없어요</Text>
        ) : (
          <View style={styles.barChart}>
            {sortedWeeks.map(wk => {
              const cnt = weeklyMap[wk];
              const h = (cnt / maxCount) * 80;
              const label = wk.slice(5);
              return (
                <View key={wk} style={styles.barCol}>
                  <Text style={styles.barNum}>{cnt}</Text>
                  <View style={[styles.bar, { height: Math.max(h, 4) }]} />
                  <Text style={styles.barLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* PR 목록 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>종목별 최고 기록 🏆</Text>
        {Object.keys(prs).length === 0 ? (
          <Text style={styles.emptyText}>아직 기록이 없어요</Text>
        ) : (
          Object.entries(prs)
            .sort((a, b) => b[1] - a[1])
            .map(([name, weight]) => (
              <View key={name} style={styles.prRow}>
                <Text style={styles.prName}>{name}</Text>
                <Text style={styles.prWeight}>{weight} kg</Text>
              </View>
            ))
        )}
      </View>

      {/* 데이터 백업 / 복원 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>데이터 관리</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
          <Text style={styles.actionBtnText}>📤  데이터 백업 (JSON 내보내기)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { marginTop: 8, borderColor: '#444' }]}
          onPress={() => setRestoreModal(true)}
        >
          <Text style={[styles.actionBtnText, { color: '#888' }]}>📥  데이터 복원 (JSON 가져오기)</Text>
        </TouchableOpacity>
      </View>

      {/* 백업 모달 */}
      <Modal visible={backupModal} animationType="slide" onRequestClose={() => setBackupModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>데이터 백업</Text>
            <TouchableOpacity onPress={() => setBackupModal(false)}>
              <Text style={styles.modalClose}>닫기</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalDesc}>아래 JSON을 복사해서 안전한 곳에 보관하세요.</Text>
          <ScrollView style={styles.jsonBox}>
            <Text style={styles.jsonText} selectable>{backupText}</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* 복원 모달 */}
      <Modal visible={restoreModal} animationType="slide" onRequestClose={() => setRestoreModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>데이터 복원</Text>
            <TouchableOpacity onPress={() => setRestoreModal(false)}>
              <Text style={styles.modalClose}>취소</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalDesc}>백업한 JSON을 아래에 붙여넣기 하세요.</Text>
          <TextInput
            style={styles.restoreInput}
            multiline
            placeholder="JSON 붙여넣기..."
            placeholderTextColor="#555"
            value={restoreText}
            onChangeText={setRestoreText}
          />
          <TouchableOpacity style={styles.restoreBtn} onPress={handleImport}>
            <Text style={styles.restoreBtnText}>복원하기</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 20 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a',
  },
  summaryNum: { color: '#6C63FF', fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: '#666', fontSize: 11, marginTop: 2 },

  avgCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 12,
  },
  avgLabel: { color: '#888', fontSize: 14 },
  avgValue: { color: '#fff', fontSize: 16, fontWeight: '700' },

  card: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#2a2a2a',
  },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 14 },
  emptyText: { color: '#444', fontSize: 13 },

  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '80%', backgroundColor: '#6C63FF', borderRadius: 4 },
  barNum: { color: '#888', fontSize: 10, marginBottom: 2 },
  barLabel: { color: '#555', fontSize: 9, marginTop: 3 },

  prRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#252525',
  },
  prName: { color: '#bbb', fontSize: 14, flex: 1 },
  prWeight: { color: '#FFD700', fontSize: 15, fontWeight: '700' },

  actionBtn: {
    borderWidth: 1, borderColor: '#6C63FF', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  actionBtnText: { color: '#6C63FF', fontSize: 14, fontWeight: '600' },

  modalContainer: { flex: 1, backgroundColor: '#0f0f0f', padding: 20, paddingTop: 60 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalClose: { color: '#6C63FF', fontSize: 16 },
  modalDesc: { color: '#666', fontSize: 13, marginBottom: 12 },
  jsonBox: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12,
  },
  jsonText: { color: '#aaa', fontSize: 11, fontFamily: 'monospace' },
  restoreInput: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12,
    color: '#fff', fontSize: 13, textAlignVertical: 'top', marginBottom: 12,
  },
  restoreBtn: {
    backgroundColor: '#6C63FF', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  restoreBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
