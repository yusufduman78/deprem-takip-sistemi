// Firebase Realtime Database service for reading historical earthquake events
// Node: /earthquake_events (as defined in backend config/settings.py)

import { db } from '../firebase'
import { ref, onValue, query, orderByChild, limitToLast, off, get } from 'firebase/database'

const EVENTS_NODE = 'earthquake_events'

/**
 * Subscribe to real-time updates from /earthquake_events
 * @param {function} callback - Called with array of events on each update
 * @param {number} limit - Number of latest events to fetch
 * @returns {function} unsubscribe function
 */
export function subscribeToEarthquakeEvents(callback, limit = 200) {
  const eventsRef = query(
    ref(db, EVENTS_NODE),
    orderByChild('server_timestamp'),
    limitToLast(limit)
  )

  const listener = onValue(eventsRef, (snapshot) => {
    const data = snapshot.val()
    if (!data) {
      callback([])
      return
    }

    // Convert object with Firebase push keys to sorted array
    const events = Object.entries(data)
      .map(([key, value]) => ({ id: key, ...value }))
      .sort((a, b) => {
        const ta = a.server_timestamp || a.timestamp || ''
        const tb = b.server_timestamp || b.timestamp || ''
        return new Date(tb) - new Date(ta)
      })

    callback(events)
  }, (error) => {
    console.error('[Firebase] onValue error:', error)
    callback([])
  })

  // Return unsubscribe function
  return () => off(eventsRef, 'value', listener)
}

/**
 * Fetch all earthquake events once (for statistics)
 */
export async function fetchAllEarthquakeEvents() {
  try {
    const snapshot = await get(ref(db, EVENTS_NODE))
    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val())
      .map(([key, value]) => ({ id: key, ...value }))
      .sort((a, b) => new Date(a.server_timestamp || a.timestamp) - new Date(b.server_timestamp || b.timestamp))
  } catch (err) {
    console.error('[Firebase] fetchAll error:', err)
    return []
  }
}
