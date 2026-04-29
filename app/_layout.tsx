import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f0f0f' } }} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0f0f' },
});
