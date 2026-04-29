import React, { useState, useEffect } from 'react'
import { getSettings, saveSettings, requestNotificationPermission } from '../services/notificationService'
import { toast } from 'react-toastify'
import { useEarthquake } from '../context/EarthquakeContext'

export default function NotificationSettings() {
  const { updateSettings } = useEarthquake()
  const [settings, setSettings] = useState(getSettings())
  const [notifPermission, setNotifPermission] = useState(Notification?.permission ?? 'unsupported')

  useEffect(() => {
    setNotifPermission(Notification?.permission ?? 'unsupported')
  }, [])

  const handleChange = (key, value) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
  }

  const handleSave = () => {
    saveSettings(settings)
    updateSettings(settings)
    toast.success('✅ Ayarlar kaydedildi')
  }

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission()
    setNotifPermission(result)
    if (result === 'granted') {
      toast.success('🔔 Bildirim izni verildi')
    } else if (result === 'denied') {
      toast.error('❌ Bildirim izni reddedildi. Tarayıcı ayarlarından açmanız gerekiyor.')
    }
  }

  const permBadge = notifPermission === 'granted'
    ? <span className="badge badge-normal">✅ İzin Verildi</span>
    : notifPermission === 'denied'
      ? <span className="badge badge-alarm">❌ Reddedildi</span>
      : <span className="badge badge-warning">⏳ Bekleniyor</span>

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">⚙️ Bildirim Ayarları</h1>
        <p className="page-subtitle">Uyarı tercihleri ve sistem konfigürasyonu</p>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* Notification Settings Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔔 Bildirim Tercihleri</div>
          </div>

          {/* Push Notification */}
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-label">Push Bildirimleri</div>
              <div className="toggle-desc">Deprem algılandığında tarayıcı bildirimi gönder</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                id="toggle-push"
                checked={settings.pushNotifications}
                onChange={e => handleChange('pushNotifications', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Email Notification */}
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-label">E-posta Bildirimleri</div>
              <div className="toggle-desc">Deprem olaylarını e-posta ile bildir (Firebase Functions gerektirir)</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                id="toggle-email"
                checked={settings.emailNotifications}
                onChange={e => handleChange('emailNotifications', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Email Address */}
          {settings.emailNotifications && (
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="email-address">E-posta Adresi</label>
              <input
                className="input"
                id="email-address"
                type="email"
                placeholder="ornek@email.com"
                value={settings.emailAddress}
                onChange={e => handleChange('emailAddress', e.target.value)}
              />
            </div>
          )}

          {/* Silent Mode */}
          <div className="toggle-row">
            <div className="toggle-info">
              <div className="toggle-label">Sessiz Mod</div>
              <div className="toggle-desc">Bildirim göster fakat ses çıkarma (opsiyonel)</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                id="toggle-silent"
                checked={settings.silentMode}
                onChange={e => handleChange('silentMode', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Min Richter */}
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label" htmlFor="min-richter">
              Minimum Richter (Uyarı Eşiği)
            </label>
            <input
              className="input"
              id="min-richter"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={settings.minRichterAlert}
              onChange={e => handleChange('minRichterAlert', parseFloat(e.target.value) || 0)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Bu değerin altındaki depremler için uyarı verilmez
            </div>
          </div>

          <button
            className="btn btn-primary"
            id="save-settings-btn"
            onClick={handleSave}
            style={{ marginTop: '0.5rem', width: '100%' }}
          >
            💾 Ayarları Kaydet
          </button>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Push Permission Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🔑 Tarayıcı İzni</div>
              {permBadge}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Push bildirimler için tarayıcı izni gereklidir. Aşağıdaki butona tıklayarak izin isteği başlatabilirsiniz.
            </p>
            {notifPermission !== 'granted' && (
              <button
                className="btn btn-primary"
                id="request-notif-permission-btn"
                onClick={handleRequestPermission}
                style={{ width: '100%' }}
              >
                🔔 Bildirim İzni İste
              </button>
            )}
            {notifPermission === 'denied' && (
              <p style={{ fontSize: '0.78rem', color: 'var(--accent-danger)', marginTop: '0.75rem' }}>
                ⚠️ İzin reddedilmiş. Tarayıcı adres çubuğundaki kilit ikonundan Site Ayarları'nı açarak Bildirimler iznini manuel olarak verebilirsiniz.
              </p>
            )}
          </div>

          {/* System Info */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">ℹ️ Sistem Bilgisi</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              {[
                ['MQTT Broker', 'broker.hivemq.com:8884 (WSS)'],
                ['Veri Kanalı', 'cloud/earthquake_events'],
                ['Sağlık Kanalı', 'system/health'],
                ['Firebase Node', '/earthquake_events'],
                ['Throttle', '5 Hz (depremde sınırsız)'],
                ['Timeout Eşiği', '10 saniye'],
                ['Watchdog Periyot', '60 saniye'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', paddingBottom: '0.625rem', borderBottom: '1px solid var(--border-default)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FCM Info */}
          <div className="card" style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)' }}>
            <div className="card-header">
              <div className="card-title">☁️ Firebase Cloud Messaging</div>
              <span className="badge badge-warning">Yapılandırma Gerekli</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              FCM ve e-posta bildirimleri için <strong style={{ color: 'var(--text-primary)' }}>Firebase Cloud Functions</strong> ile
              <strong style={{ color: 'var(--text-primary)' }}> Nodemailer</strong> yapılandırılması gerekir.
              <br /><br />
              SMTP bilgileri yalnızca backend/cloud function tarafında tutulur — frontend'e gömülmez.
            </p>
            <div style={{ marginTop: '0.75rem', padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
              VITE_FIREBASE_VAPID_KEY=your_key
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
