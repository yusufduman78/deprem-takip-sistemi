import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { mqttService, TOPIC_EVENTS, TOPIC_HEALTH } from '../services/mqttService'
import { subscribeToEarthquakeEvents } from '../services/firebaseService'
import { getSettings, showLocalNotification } from '../services/notificationService'
import { toast } from 'react-toastify'

const EarthquakeContext = createContext(null)

// Max live graph points
const MAX_LIVE_POINTS = 60

export function EarthquakeProvider({ children }) {
  const [mqttStatus, setMqttStatus] = useState('connecting') // connecting | connected | reconnecting | disconnected
  const [liveData, setLiveData] = useState(null)             // Latest sensor packet
  const [isAlarm, setIsAlarm] = useState(false)              // Earthquake alarm state
  const [systemHealth, setSystemHealth] = useState(null)     // Bridge watchdog telemetry
  const [historicalEvents, setHistoricalEvents] = useState([]) // Firebase events
  const [graphPoints, setGraphPoints] = useState([])          // Live chart data
  const [settings, setSettings] = useState(getSettings())
  const alarmTimeoutRef = useRef(null)

  // MQTT: Connect on mount
  useEffect(() => {
    mqttService.connect(setMqttStatus)

    const handleEvent = (data) => {
      // Timeout/error message from bridge
      if (data.status === 'TIMEOUT') {
        toast.warn(`⚠️ Sensör zaman aşımı: ${data.device_id}`, { toastId: `timeout-${data.device_id}` })
        return
      }

      setLiveData(data)

      // Add point to live graph (keep last MAX_LIVE_POINTS)
      setGraphPoints(prev => {
        const point = {
          time: data.server_timestamp || data.timestamp || new Date().toISOString(),
          accel_x: data.accel_x ?? 0,
          accel_y: data.accel_y ?? 0,
          accel_z: data.accel_z ?? 9.81,
          richter: data.richter ?? 0,
          pga: data.pga ?? 0,
        }
        const updated = [...prev, point]
        return updated.length > MAX_LIVE_POINTS ? updated.slice(-MAX_LIVE_POINTS) : updated
      })

      // Earthquake alarm handling
      if (data.deprem_flag === true) {
        setIsAlarm(true)

        const currentSettings = getSettings()
        // Push notification
        if (currentSettings.pushNotifications && !currentSettings.silentMode) {
          const time = new Date(data.server_timestamp || data.timestamp).toLocaleTimeString('tr-TR')
          showLocalNotification(
            '🔴 DEPREM UYARISI!',
            `Richter: ${data.richter?.toFixed(1)} | PGA: ${data.pga?.toFixed(3)} cm/s² | Saat: ${time}`
          )
        }

        // Toast alarm
        toast.error(
          `🔴 DEPREM ALARMI! Richter: ${data.richter?.toFixed(1) ?? '?'} | PGA: ${data.pga?.toFixed(3) ?? '?'} cm/s²`,
          { autoClose: 8000, toastId: 'earthquake-alarm' }
        )

        // Clear alarm after 30 seconds of no new alarm data
        if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current)
        alarmTimeoutRef.current = setTimeout(() => setIsAlarm(false), 30000)
      }
    }

    const handleHealth = (data) => {
      setSystemHealth(data)
    }

    const handleToast = ({ type, message }) => {
      toast[type]?.(message)
    }

    mqttService.on(TOPIC_EVENTS, handleEvent)
    mqttService.on(TOPIC_HEALTH, handleHealth)
    mqttService.on('toast', handleToast)

    return () => {
      mqttService.off(TOPIC_EVENTS, handleEvent)
      mqttService.off(TOPIC_HEALTH, handleHealth)
      mqttService.off('toast', handleToast)
    }
  }, [])

  // Firebase: Subscribe to historical events
  useEffect(() => {
    const unsub = subscribeToEarthquakeEvents(setHistoricalEvents, 500)
    return unsub
  }, [])

  const updateSettings = useCallback((newSettings) => {
    setSettings(newSettings)
  }, [])

  const value = {
    mqttStatus,
    liveData,
    isAlarm,
    systemHealth,
    historicalEvents,
    graphPoints,
    settings,
    updateSettings,
  }

  return (
    <EarthquakeContext.Provider value={value}>
      {children}
    </EarthquakeContext.Provider>
  )
}

export function useEarthquake() {
  const ctx = useContext(EarthquakeContext)
  if (!ctx) throw new Error('useEarthquake must be used inside EarthquakeProvider')
  return ctx
}
