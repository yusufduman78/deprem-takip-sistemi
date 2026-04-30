// MQTT Client using HiveMQ WebSocket
// Topic: cloud/earthquake_events (processed, throttled data from Bridge)
// Topic: system/health (watchdog telemetry)

import mqtt from 'mqtt'

const BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL || 'wss://broker.hivemq.com:8884/mqtt'
const TOPIC_EVENTS = import.meta.env.VITE_MQTT_TOPIC_CLOUD_EVENTS || 'cloud/earthquake_events'
const TOPIC_HEALTH = import.meta.env.VITE_MQTT_TOPIC_SYSTEM_HEALTH || 'system/health'

const QUEUE_KEY = 'dts_offline_queue'
const MAX_QUEUE_SIZE = 200

class MQTTService {
  constructor() {
    this.client = null
    this.listeners = new Map()
    this.connected = false
    this.reconnectAttempts = 0
    this.MAX_RECONNECT = 5
    this._queue = this._loadQueue()
  }

  // Offline Queue: persist to localStorage
  _loadQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    } catch { return [] }
  }

  _saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this._queue.slice(-MAX_QUEUE_SIZE)))
    } catch { /* storage full, ignore */ }
  }

  _enqueue(topic, data) {
    this._queue.push({ topic, data, ts: Date.now() })
    if (this._queue.length > MAX_QUEUE_SIZE) this._queue = this._queue.slice(-MAX_QUEUE_SIZE)
    this._saveQueue()
    console.log(`[MQTT Queue] Enqueued message (${this._queue.length} pending)`)
  }

  _flushQueue() {
    if (!this._queue.length) return
    console.log(`[MQTT Queue] Flushing ${this._queue.length} queued messages`)
    const pending = [...this._queue]
    this._queue = []
    this._saveQueue()
    pending.forEach(({ topic, data }) => this._emit(topic, data))
  }

  get queueSize() { return this._queue.length }

  connect(onStatusChange) {
    if (this.client) return

    const clientId = `dts-dashboard-${Math.random().toString(16).slice(2, 8)}`

    this.client = mqtt.connect(BROKER_URL, {
      clientId,
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 3000,
      keepalive: 60,
    })

    this.client.on('connect', () => {
      this.connected = true
      this.reconnectAttempts = 0
      console.log('[MQTT] Connected to HiveMQ broker')
      onStatusChange?.('connected')

      // Subscribe to bridge output channels (as specified in README)
      this.client.subscribe([TOPIC_EVENTS, TOPIC_HEALTH], { qos: 1 }, (err) => {
        if (err) console.error('[MQTT] Subscribe error:', err)
        else {
          console.log('[MQTT] Subscribed to cloud/earthquake_events & system/health')
          // Flush any messages that were queued while offline
          this._flushQueue()
        }
      })
    })

    this.client.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString())
        this._emit(topic, data)
      } catch (e) {
        console.error('[MQTT] Invalid JSON received, ignoring:', e.message)
        this._emit('toast', { type: 'error', message: 'Geçersiz sensör verisi alındı' })
      }
    })

    this.client.on('reconnect', () => {
      this.reconnectAttempts++
      console.warn(`[MQTT] Reconnecting... attempt ${this.reconnectAttempts}`)
      onStatusChange?.('reconnecting')

      if (this.reconnectAttempts >= this.MAX_RECONNECT) {
        console.error('[MQTT] Max reconnect attempts reached')
        onStatusChange?.('disconnected')
      }
    })

    this.client.on('offline', () => {
      this.connected = false
      onStatusChange?.('disconnected')
    })

    this.client.on('error', (err) => {
      console.error('[MQTT] Error:', err.message)
    })
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return
    const updated = this.listeners.get(event).filter(cb => cb !== callback)
    this.listeners.set(event, updated)
  }

  _emit(event, data) {
    const cbs = this.listeners.get(event) || []
    cbs.forEach(cb => cb(data))
  }

  disconnect() {
    if (this.client) {
      this.client.end()
      this.client = null
      this.connected = false
    }
  }

  get topicEvents() { return TOPIC_EVENTS }
  get topicHealth() { return TOPIC_HEALTH }
}

// Singleton instance
export const mqttService = new MQTTService()
export { TOPIC_EVENTS, TOPIC_HEALTH }
