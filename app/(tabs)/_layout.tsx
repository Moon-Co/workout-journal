import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6C63FF',
        tabBarStyle: { backgroundColor: '#0f0f0f', borderTopColor: '#1e1e1e' },
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="record" options={{ title: '기록' }} />
      <Tabs.Screen name="routine" options={{ title: '루틴' }} />
      <Tabs.Screen name="stats" options={{ title: '통계' }} />
      <Tabs.Screen name="body" options={{ title: '바디' }} />
    </Tabs>
  );
}
