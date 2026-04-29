import { View, Text, StyleSheet } from 'react-native';

export default function BodyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>바디 트래킹</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f0f' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
});
