import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/core';
import { getAllSessions, updateSession, deleteSession, WorkoutSession } from '@/db/database';
import { useWorkoutStore } from '@/store/workoutStore';
import SessionEditModal from '@/components/SessionEditModal';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

function buildCalendar(year: number, month: number, workoutDates: Set<string>) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // 월=0
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function pad(n: number) { return n.toString().padStart(2, '0'); }

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}분 ${s > 0 ? s + '초' : ''}` : `${s}초`;
}

export default function HomeScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [editing, setEditing] = useState<WorkoutSession | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { reset, setTitle, addExercise } = useWorkoutStore();

  useFocusEffect(
    useCallback(() => { getAllSessions().then(setSessions); }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await getAllSessions().then(setSessions);
    setRefreshing(false);
  }

  async function handleSave(updated: WorkoutSession) {
    await updateSession(updated);
    setEditing(null);
    getAllSessions().then(setSessions);
  }

  function handleDeleteConfirm(session: WorkoutSession) {
    Alert.alert('기록 삭제', `"${session.title}" 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          await deleteSession(session.id);
          getAllSessions().then(setSessions);
        },
      },
    ]);
  }

  function handleCopy(session: WorkoutSession) {
    Alert.alert('운동 복사', `"${session.title}" 운동을 오늘 기록으로 불러올까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '불러오기', onPress: () => {
          reset();
          setTitle(session.title);
          session.exercises.forEach(e =>
            addExercise(e.name, e.name, '')
          );
          router.push('/(tabs)/record');
        },
      },
    ]);
  }

  function totalVolume(session: WorkoutSession) {
    return session.exercises.reduce(
      (total, e) => total + e.sets.reduce((s, set) => s + set.weight * set.reps, 0),
      0
    );
  }

  // 캘린더 데이터
  const { year, month } = calMonth;
  const workoutDates = new Set(sessions.map(s => s.date));
  const today = new Date().toISOString().split('T')[0];
  const cells = buildCalendar(year, month, workoutDates);

  function prevMonth() {
    setCalMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }
  function nextMonth() {
    setCalMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  const monthStr = `${year}-${pad(month + 1)}`;
  const monthSessions = sessions.filter(s => s.date.startsWith(monthStr));

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
      >
        <Text style={styles.header}>운동일지</Text>

        {/* ── 캘린더 ── */}
        <View style={styles.calCard}>
          <View style={styles.calHeader}>
            <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.calArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.calTitle}>
              {year}년 {month + 1}월 · {monthSessions.length}회
            </Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.calArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 요일 헤더 */}
          <View style={styles.calRow}>
            {DAYS.map(d => (
              <Text key={d} style={styles.calDayHeader}>{d}</Text>
            ))}
          </View>

          {/* 날짜 */}
          {Array.from({ length: cells.length / 7 }, (_, wi) => (
            <View key={wi} style={styles.calRow}>
              {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
                if (!day) return <View key={di} style={styles.calCell} />;
                const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
                const hasWorkout = workoutDates.has(dateStr);
                const isToday = dateStr === today;
                return (
                  <View key={di} style={styles.calCell}>
                    <View style={[
                      styles.calDot,
                      hasWorkout && styles.calDotWorkout,
                      isToday && styles.calDotToday,
                    ]}>
                      <Text style={[
                        styles.calDayText,
                        hasWorkout && styles.calDayTextWorkout,
                        isToday && styles.calDayTextToday,
                      ]}>
                        {day}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── 기록 목록 ── */}
        {sessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>아직 기록이 없어요</Text>
            <Text style={styles.emptySubText}>기록 탭에서 첫 운동을 시작해보세요 💪</Text>
          </View>
        ) : (
          sessions.map((session) => (
            <View key={session.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{session.date}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopy(session)}>
                    <Text style={styles.copyBtnText}>복사</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(session)}>
                    <Text style={styles.editBtnText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteConfirm(session)}>
                    <Text style={styles.deleteBtnText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.cardTitle}>{session.title}</Text>

              <View style={styles.exerciseList}>
                {session.exercises.map((e, i) => (
                  <Text key={i} style={styles.exerciseItem}>
                    · {e.name}  <Text style={styles.setCount}>{e.sets.length}세트</Text>
                  </Text>
                ))}
              </View>

              {session.note ? (
                <Text style={styles.note}>📝 {session.note}</Text>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={styles.volume}>
                  볼륨  <Text style={styles.volumeNum}>{totalVolume(session).toLocaleString()} kg</Text>
                </Text>
                {session.duration != null && (
                  <Text style={styles.volume}>
                    ⏱  <Text style={styles.volumeNum}>{fmtDuration(session.duration)}</Text>
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

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
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  header: {
    fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 16,
  },

  // ── 캘린더 ──
  calCard: {
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a',
  },
  calHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  calArrow: { color: '#6C63FF', fontSize: 22, fontWeight: '700', paddingHorizontal: 8 },
  calTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  calRow: { flexDirection: 'row' },
  calDayHeader: { flex: 1, textAlign: 'center', color: '#555', fontSize: 11, paddingBottom: 6 },
  calCell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  calDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  calDotWorkout: { backgroundColor: '#6C63FF' },
  calDotToday: { borderWidth: 1.5, borderColor: '#6C63FF' },
  calDayText: { color: '#555', fontSize: 12 },
  calDayTextWorkout: { color: '#fff', fontWeight: '700' },
  calDayTextToday: { color: '#6C63FF', fontWeight: '700' },

  // ── 빈 상태 ──
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#555', fontSize: 17, fontWeight: '600', marginBottom: 6 },
  emptySubText: { color: '#444', fontSize: 14 },

  // ── 세션 카드 ──
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  cardDate: { color: '#555', fontSize: 13 },
  cardActions: { flexDirection: 'row', gap: 6 },

  copyBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#4CAF50',
  },
  copyBtnText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },

  editBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#6C63FF',
  },
  editBtnText: { color: '#6C63FF', fontSize: 12, fontWeight: '600' },

  deleteBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#444',
  },
  deleteBtnText: { color: '#888', fontSize: 12 },

  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 10 },

  exerciseList: { marginBottom: 8 },
  exerciseItem: { color: '#bbb', fontSize: 14, marginBottom: 2 },
  setCount: { color: '#555', fontSize: 13 },

  note: { color: '#666', fontSize: 13, marginBottom: 8, fontStyle: 'italic' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  volume: { color: '#555', fontSize: 13 },
  volumeNum: { color: '#6C63FF', fontWeight: '700' },
});
