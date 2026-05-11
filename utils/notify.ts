import { Platform } from 'react-native';

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } else {
    try {
      const n = await import('expo-notifications');
      n.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      await n.requestPermissionsAsync();
    } catch (_) {}
  }
}

export async function sendNotification(title: string, body: string) {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, { body });
  } else {
    try {
      const n = await import('expo-notifications');
      await n.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch (_) {}
  }
}
