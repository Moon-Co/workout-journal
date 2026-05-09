import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/core';
import { getAllSessions, updateSession, deleteSession, WorkoutSession } from '@/db/database';
import SessionEditModal from '@/components/SessionEditModal';

export default function HomeScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [editing, setEditing] = useState<WorkoutSession | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadSessions() {
    setSessions(await getAllSessions());
  }

  // 탭 포커스될 때마다 새로고침
  useFocusEffect(
    useCallback(() => { loadSessions(); }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }

  async function handleSave(updated: WorkoutSession) {
    await updateSession(updated);
    setEditing(null);
    await loadSessions();
  }

  function handleDeleteConfirm(session: WorkoutSession) {
    Alert.alert(
      '기록 삭제',
      `"${session.title}" 기록을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제', style: 'destructive',
          onPress: async () => {
            await deleteSession(session.id);
            await loadSessions();
          },
        },
      ]
    );
  }

  function totalVolume(session: WorkoutSession) {
    return session.exercises.reduce(
      (total, e) => total + e.sets.reduce((s, set) => s + set.weight * set.reps, 0),
      0
    );
  }

  function fmtDuration(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>운동일지</Text>

      {sessions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>아직 기록이 없어요</Text>
          <Text style={styles.emptySubText}>운동 탭에서 첫 기록을 시작해보세요 💪</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
        >
          {sessions.map((session) => (
            <View key={session.id} style={styles.card}>
              {/* 날짜 + 버튼 */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{session.date}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(session)}>
                    <Text style={styles.editBtnText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteConfirm(session)}>
                    <Text style={styles.deleteBtnText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 제목 */}
              <Text style={styles.cardTitle}>{session.title}</Text>

              {/* 운동 요약 */}
              <View style={styles.exerciseList}>
                {session.exercises.map((e, i) => (
                  <Text key={i} style={styles.exerciseItem}>
                    · {e.name}  <Text style={styles.setCount}>{e.sets.length}세트</Text>
                  </Text>
                ))}
              </View>

              {/* 총 볼륨 + 운동 시간 */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.volume}>
                  총 볼륨  <Text style={styles.volumeNum}>{totalVolume(session).toLocaleString()} kg</Text>
                </Text>
                {session.duration != null && (
                  <Text style={styles.volume}>
                    ⏱  <Text style={styles.volumeNum}>{fmtDuration(session.duration)}</Text>
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {editing && (
        <SessionEditModal
          session={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: {
    fontSize: 26, fontWeight: 'bold', color: '#fff',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: '#555', fontSize: 17, fontWeight: '600' },
  emptySubText: { color: '#444', fontSize: 14 },

  list: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#2a2a2a',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardDate: { color: '#555', fontSize: 13 },
  cardActions: { flexDirection: 'row', gap: 8 },

  editBtn: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#6C63FF',
  },
  editBtnText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },

  deleteBtn: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#444',
  },
  deleteBtnText: { color: '#888', fontSize: 13 },

  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },

  exerciseList: { marginBottom: 10, gap: 3 },
  exerciseItem: { color: '#bbb', fontSize: 14 },
  setCount: { color: '#555', fontSize: 13 },

  volume: { color: '#555', fontSize: 13 },
  volumeNum: { color: '#6C63FF', fontWeight: '700' },
});
