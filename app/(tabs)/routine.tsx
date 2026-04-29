import { View, Text, StyleSheet } from 'react-native';

export default function RoutineScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>루틴 관리</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f0f' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
});
