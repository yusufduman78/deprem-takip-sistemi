// Local storage based notification & settings service
// In production: Firebase Realtime Database could be used to persist settings

const SETTINGS_KEY = 'dts_user_settings'

const defaultSettings = {
  pushNotifications: true,
  emailNotifications: false,
  emailAddress: '',
  darkMode: true,
  silentMode: false,
  minRichterAlert: 2.0,
}

export function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) }
  } catch (e) {
    console.warn('Could not load settings:', e)
  }
  return { ...defaultSettings }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('Could not save settings:', e)
  }
}

/**
 * Request push notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'

  const result = await Notification.requestPermission()
  return result
}

/**
 * Show a local push notification (fallback if FCM is not configured)
 */
export function showLocalNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/earthquake-icon.svg',
      badge: '/earthquake-icon.svg',
      tag: 'earthquake-alert',
      requireInteraction: true,
    })
  }
}
