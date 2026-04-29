import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>운동일지</Text>
      <Text style={styles.sub}>오늘도 운동하자 💪</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f0f' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  sub: { fontSize: 16, color: '#aaa', marginTop: 8 },
});
