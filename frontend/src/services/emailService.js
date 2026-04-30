// EmailJS Service - Free email notifications for earthquake alerts
// Uses EmailJS (https://www.emailjs.com) - 200 emails/month free tier
// No backend needed - sends directly from browser

import emailjs from '@emailjs/browser'

// EmailJS credentials from environment variables
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || ''
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || ''
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''

let initialized = false

/**
 * Initialize EmailJS with public key (call once on app startup)
 */
export function initEmailJS() {
  if (initialized || !PUBLIC_KEY) return
  emailjs.init(PUBLIC_KEY)
  initialized = true
  console.log('[EmailJS] Initialized')
}

/**
 * Send earthquake alert email
 * @param {Object} data - Earthquake event data from MQTT
 * @param {string} recipientEmail - Destination email address
 * @returns {Promise<boolean>} - true if sent successfully
 */
export async function sendEarthquakeEmail(data, recipientEmail) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('[EmailJS] Not configured — skipping email. Set VITE_EMAILJS_* env vars.')
    return false
  }

  if (!recipientEmail) {
    console.warn('[EmailJS] No recipient email set')
    return false
  }

  initEmailJS()

  const time = data.server_timestamp || data.timestamp
  const timeStr = time
    ? new Date(typeof time === 'number' && time < 2e10 ? time * 1000 : time)
        .toLocaleString('tr-TR')
    : 'Bilinmiyor'

  const templateParams = {
    to_email: recipientEmail,
    subject: `🔴 DTS DEPREM UYARISI — Richter: ${data.richter?.toFixed(1) ?? '?'}`,
    richter: data.richter?.toFixed(2) ?? 'N/A',
    pga: data.pga?.toFixed(4) ?? 'N/A',
    device_id: data.device_id ?? 'N/A',
    accel_x: data.accel_x?.toFixed(3) ?? 'N/A',
    accel_y: data.accel_y?.toFixed(3) ?? 'N/A',
    accel_z: data.accel_z?.toFixed(3) ?? 'N/A',
    timestamp: timeStr,
    message: `Deprem algılandı! Richter: ${data.richter?.toFixed(1)}, PGA: ${data.pga?.toFixed(3)} cm/s², Cihaz: ${data.device_id}, Saat: ${timeStr}`,
  }

  try {
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
    console.log('[EmailJS] Email sent successfully:', response.status)
    return true
  } catch (error) {
    console.error('[EmailJS] Failed to send email:', error)
    return false
  }
}

/**
 * Check if EmailJS is properly configured
 */
export function isEmailConfigured() {
  return !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)
}
