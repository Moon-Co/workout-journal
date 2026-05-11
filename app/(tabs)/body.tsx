import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/core';
import { getBodyWeights, saveBodyWeight, deleteBodyWeight, BodyWeight } from '@/db/database';

function today() {
  return new Date().toISOString().split('T')[0];
}

function miniChart(entries: BodyWeight[]) {
  const last14 = [...entries].reverse().slice(-14);
  if (last14.length < 2) return null;
  const weights = last14.map(e => e.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  return { last14, min, max, range };
}

export default function BodyScreen() {
  const [entries, setEntries] = useState<BodyWeight[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(today());

  useFocusEffect(
    useCallback(() => {
      getBodyWeights().then(setEntries);
    }, [])
  );

  async function handleSave() {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) { Alert.alert('올바른 체중을 입력해주세요'); return; }
    await saveBodyWeight(w, dateInput);
    setWeightInput('');
    setDateInput(today());
    getBodyWeights().then(setEntries);
  }

  async function handleDelete(id: string) {
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          await deleteBodyWeight(id);
          getBodyWeights().then(setEntries);
        },
      },
    ]);
  }

  const chart = miniChart(entries);
  const latest = entries[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>바디 트래킹</Text>

      {/* 최근 체중 */}
      {latest && (
        <View style={styles.latestCard}>
          <Text style={styles.latestLabel}>최근 체중</Text>
          <Text style={styles.latestWeight}>{latest.weight} <Text style={styles.latestUnit}>kg</Text></Text>
          <Text style={styles.latestDate}>{latest.date}</Text>
        </View>
      )}

      {/* 입력 */}
      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>체중 기록</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="날짜 (YYYY-MM-DD)"
            placeholderTextColor="#555"
            value={dateInput}
            onChangeText={setDateInput}
          />
          <TextInput
            style={[styles.input, { width: 90 }]}
            placeholder="kg"
            placeholderTextColor="#555"
            keyboardType="numeric"
            value={weightInput}
            onChangeText={setWeightInput}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 미니 차트 */}
      {chart && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>최근 {chart.last14.length}일 추이</Text>
          <View style={styles.chartArea}>
            {chart.last14.map((e, i) => {
              const h = ((e.weight - chart.min) / chart.range) * 80 + 10;
              return (
                <View key={e.id} style={styles.barWrap}>
                  <Text style={styles.barValue}>{e.weight}</Text>
                  <View style={[styles.bar, { height: h }]} />
                  <Text style={styles.barDate}>{e.date.slice(5)}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.chartRange}>
            <Text style={styles.chartRangeText}>최저 {chart.min}kg</Text>
            <Text style={styles.chartRangeText}>최고 {chart.max}kg</Text>
          </View>
        </View>
      )}

      {/* 기록 목록 */}
      <Text style={styles.sectionTitle}>전체 기록</Text>
      {entries.length === 0 && (
        <Text style={styles.emptyText}>아직 체중 기록이 없어요</Text>
      )}
      {entries.map(e => (
        <View key={e.id} style={styles.entryRow}>
          <Text style={styles.entryDate}>{e.date}</Text>
          <Text style={styles.entryWeight}>{e.weight} kg</Text>
          <TouchableOpacity onPress={() => handleDelete(e.id)}>
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 20 },

  latestCard: {
    backgroundColor: '#6C63FF', borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 16,
  },
  latestLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  latestWeight: { color: '#fff', fontSize: 48, fontWeight: '800' },
  latestUnit: { fontSize: 20, fontWeight: '400' },
  latestDate: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },

  inputCard: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a',
  },
  inputLabel: { color: '#888', fontSize: 13, marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    backgroundColor: '#252525', borderRadius: 8, padding: 10,
    color: '#fff', fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#6C63FF', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, marginLeft: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  chartCard: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#2a2a2a',
  },
  chartTitle: { color: '#888', fontSize: 13, marginBottom: 12 },
  chartArea: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 120, justifyContent: 'space-between',
  },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '60%', backgroundColor: '#6C63FF', borderRadius: 3, minHeight: 4 },
  barValue: { color: '#555', fontSize: 8, marginBottom: 2 },
  barDate: { color: '#444', fontSize: 7, marginTop: 2 },
  chartRange: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 8,
  },
  chartRangeText: { color: '#555', fontSize: 11 },

  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: '#444', fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  entryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  entryDate: { color: '#888', fontSize: 14, flex: 1 },
  entryWeight: { color: '#fff', fontSize: 16, fontWeight: '600', marginRight: 16 },
  deleteBtn: { color: '#ff4444', fontSize: 16 },
});
