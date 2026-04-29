import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  Vibration, StyleSheet, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TimerState = 'idle' | 'running' | 'paused' | 'done';

const PRESETS = [
  { label: '30초', seconds: 30 },
  { label: '1분', seconds: 60 },
  { label: '1:30', seconds: 90 },
  { label: '2분', seconds: 120 },
  { label: '3분', seconds: 180 },
];

const TIMER_KEY = '@workout_timer_seconds';

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function WorkoutTimer() {
  const [expanded, setExpanded] = useState(false);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [total, setTotal] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [minInput, setMinInput] = useState('1');
  const [secInput, setSecInput] = useState('00');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(60);
  const totalRef = useRef(60);

  useEffect(() => {
    AsyncStorage.getItem(TIMER_KEY).then((v) => {
      if (v) {
        const n = parseInt(v, 10);
        if (n > 0) applyPreset(n);
      }
    });
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function applyPreset(secs: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTimerState('idle');
    totalRef.current = secs;
    remainingRef.current = secs;
    setTotal(secs);
    setRemaining(secs);
    setMinInput(Math.floor(secs / 60).toString());
    setSecInput((secs % 60).toString().padStart(2, '0'));
    AsyncStorage.setItem(TIMER_KEY, secs.toString());
  }

  function handleManualApply() {
    const m = Math.max(0, parseInt(minInput, 10) || 0);
    const s = Math.min(59, Math.max(0, parseInt(secInput, 10) || 0));
    const n = m * 60 + s;
    if (n > 0) applyPreset(n);
  }

  function startCountdown() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('running');
    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;
      setRemaining(remainingRef.current);
      if (remainingRef.current <= 0) {
        clearInterval(intervalRef.current!);
        setTimerState('done');
        Vibration.vibrate([0, 500, 200, 500, 200, 500]);
        timeoutRef.current = setTimeout(() => {
          remainingRef.current = totalRef.current;
          setRemaining(totalRef.current);
          setTimerState('idle');
        }, 3000);
      }
    }, 1000);
  }

  function handleStart() {
    if (timerState === 'idle' || timerState === 'done') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      remainingRef.current = totalRef.current;
      setRemaining(totalRef.current);
    }
    startCountdown();
  }

  function handlePause() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('paused');
  }

  function handleReset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    remainingRef.current = totalRef.current;
    setRemaining(totalRef.current);
    setTimerState('idle');
  }

  const stateColor: Record<TimerState, string> = {
    idle: '#888',
    running: '#4CAF50',
    paused: '#FFC107',
    done: '#ff4444',
  };
  const color = stateColor[timerState];

  if (!expanded) {
    return (
      <TouchableOpacity
        style={[styles.pill, { borderColor: color }]}
        onPress={() => setExpanded(true)}
        activeOpacity={0.75}
      >
        <Text style={[styles.pillText, { color }]}>
          {timerState === 'idle' ? '⏱' : fmt(remaining)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>타이머</Text>
        <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.presetRow}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p.seconds}
            style={[styles.presetBtn, total === p.seconds && styles.presetBtnActive]}
            onPress={() => applyPreset(p.seconds)}
          >
            <Text style={[styles.presetText, total === p.seconds && styles.presetTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.manualRow}>
        <TextInput
          style={styles.timeInput}
          value={minInput}
          onChangeText={setMinInput}
          keyboardType="numeric"
          maxLength={2}
          placeholder="0"
          placeholderTextColor="#555"
          onBlur={handleManualApply}
          selectTextOnFocus
        />
        <Text style={styles.colon}>:</Text>
        <TextInput
          style={styles.timeInput}
          value={secInput}
          onChangeText={setSecInput}
          keyboardType="numeric"
          maxLength={2}
          placeholder="00"
          placeholderTextColor="#555"
          onBlur={handleManualApply}
          selectTextOnFocus
        />
      </View>

      <Text style={[styles.bigTime, { color }]}>{fmt(remaining)}</Text>

      <View style={styles.ctrlRow}>
        {(timerState === 'idle' || timerState === 'done') && (
          <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: '#4CAF50' }]} onPress={handleStart}>
            <Text style={styles.ctrlText}>시작</Text>
          </TouchableOpacity>
        )}
        {timerState === 'running' && (
          <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: '#FFC107' }]} onPress={handlePause}>
            <Text style={styles.ctrlText}>일시정지</Text>
          </TouchableOpacity>
        )}
        {timerState === 'paused' && (
          <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: '#4CAF50' }]} onPress={handleStart}>
            <Text style={styles.ctrlText}>재개</Text>
          </TouchableOpacity>
        )}
        {(timerState === 'running' || timerState === 'paused') && (
          <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: '#333', marginLeft: 8 }]} onPress={handleReset}>
            <Text style={styles.ctrlText}>리셋</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const TOP = Platform.OS === 'ios' ? 58 : 36;

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: TOP,
    left: 16,
    zIndex: 100,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    minWidth: 44,
    alignItems: 'center',
  },
  pillText: { fontSize: 13, fontWeight: '700' },

  panel: {
    position: 'absolute',
    top: TOP,
    left: 16,
    zIndex: 100,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
    width: 248,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  panelTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  closeBtn: { color: '#666', fontSize: 15 },

  presetRow: {
    flexDirection: 'row',
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  presetBtn: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  presetBtnActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  presetText: { color: '#888', fontSize: 11, fontWeight: '600' },
  presetTextActive: { color: '#fff' },

  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  timeInput: {
    backgroundColor: '#252525',
    borderRadius: 8,
    paddingVertical: 6,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    width: 52,
  },
  colon: { color: '#fff', fontSize: 20, fontWeight: '800', marginHorizontal: 6 },

  bigTime: {
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },

  ctrlRow: { flexDirection: 'row', justifyContent: 'center' },
  ctrlBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  ctrlText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
