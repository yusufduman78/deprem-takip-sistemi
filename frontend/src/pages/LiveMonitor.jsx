import React, { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { useEarthquake } from '../context/EarthquakeContext'
import SystemHealthWidget from '../components/SystemHealthWidget'

// Format time for X-axis tick
function formatTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ts
  }
}

// Custom tooltip for chart
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(19,24,36,0.95)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 6 }}>{formatTime(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{Number(p.value).toFixed(3)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function LiveMonitor() {
  const { liveData, isAlarm, graphPoints, systemHealth } = useEarthquake()

  const lastTime = liveData?.server_timestamp || liveData?.timestamp
  const timeStr = lastTime ? new Date(lastTime).toLocaleString('tr-TR') : '—'

  // Enrich graph points with readable time label
  const chartData = useMemo(() =>
    graphPoints.map(p => ({ ...p, _label: formatTime(p.time) })),
    [graphPoints]
  )

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">📡 Canlı İzleme</h1>
        <p className="page-subtitle">Gerçek zamanlı sensör verileri — MQTT üzerinden köprü çıkışı dinleniyor</p>
      </div>

      {/* Stat Cards Row */}
      <div className="stat-cards-grid">
        {/* System Status */}
        <div className="stat-card" style={{ '--stat-color': isAlarm ? 'var(--accent-danger)' : 'var(--accent-success)', '--stat-icon-bg': isAlarm ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}>
          <div className="stat-icon">{isAlarm ? '🚨' : '✅'}</div>
          <div className="stat-content">
            <div className="stat-label">Sistem Durumu</div>
            <div className={`system-status ${isAlarm ? 'alarm' : 'normal'}`} style={{ marginTop: 6, fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              {isAlarm ? '⚠ DEPREM ALARMI' : '◉ NORMAL'}
            </div>
          </div>
        </div>

        {/* Richter */}
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-warning)', '--stat-icon-bg': 'rgba(245,158,11,0.1)' }}>
          <div className="stat-icon">📏</div>
          <div className="stat-content">
            <div className="stat-label">Son Richter</div>
            <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>
              {liveData?.richter?.toFixed(2) ?? '—'}
            </div>
            <div className="stat-sub">Büyüklük</div>
          </div>
        </div>

        {/* PGA */}
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-primary)', '--stat-icon-bg': 'rgba(59,130,246,0.1)' }}>
          <div className="stat-icon">📡</div>
          <div className="stat-content">
            <div className="stat-label">Son PGA</div>
            <div className="stat-value" style={{ color: 'var(--accent-primary)', fontSize: '1.35rem' }}>
              {liveData?.pga?.toFixed(4) ?? '—'}
            </div>
            <div className="stat-sub">cm/s²</div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-secondary)', '--stat-icon-bg': 'rgba(99,102,241,0.1)' }}>
          <div className="stat-icon">🕐</div>
          <div className="stat-content">
            <div className="stat-label">Son Olay Zamanı</div>
            <div className="stat-value mono" style={{ color: 'var(--accent-secondary)', fontSize: '0.9rem', lineHeight: 1.4, marginTop: 4 }}>
              {timeStr}
            </div>
          </div>
        </div>

        {/* Device ID */}
        <div className="stat-card" style={{ '--stat-color': 'var(--text-muted)', '--stat-icon-bg': 'rgba(255,255,255,0.04)' }}>
          <div className="stat-icon">🔌</div>
          <div className="stat-content">
            <div className="stat-label">Cihaz ID</div>
            <div className="stat-value mono" style={{ fontSize: '1rem', marginTop: 6 }}>
              {liveData?.device_id ?? '—'}
            </div>
          </div>
        </div>

        {/* Accel Z */}
        <div className="stat-card" style={{ '--stat-color': '#a855f7', '--stat-icon-bg': 'rgba(168,85,247,0.1)' }}>
          <div className="stat-icon">⬆️</div>
          <div className="stat-content">
            <div className="stat-label">Accel Z (Dikey)</div>
            <div className="stat-value mono" style={{ color: '#a855f7' }}>
              {liveData?.accel_z?.toFixed(3) ?? '—'}
            </div>
            <div className="stat-sub">m/s²</div>
          </div>
        </div>
      </div>

      {/* Charts + Health Grid */}
      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Live Accelerometer Chart */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div className="card-title">📈 Canlı İvmeölçer Grafiği</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Son {Math.min(graphPoints.length, 60)} nokta
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 0' }}>
              <div className="empty-state-icon">📡</div>
              <div className="empty-state-text">Sensör verisi bekleniyor...</div>
            </div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="_label"
                    tick={{ fill: '#475569', fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
                    formatter={(value) => value === 'accel_x' ? 'Accel X' : value === 'accel_y' ? 'Accel Y' : 'Accel Z'}
                  />
                  <Line type="monotone" dataKey="accel_x" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="accel_x" />
                  <Line type="monotone" dataKey="accel_y" stroke="#10b981" strokeWidth={1.5} dot={false} name="accel_y" />
                  <Line type="monotone" dataKey="accel_z" stroke="#a855f7" strokeWidth={1.5} dot={false} name="accel_z" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Latest packet raw data */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📦 Son MQTT Paketi</div>
            {liveData?.deprem_flag && (
              <span className="badge badge-alarm">🚨 DEPREM</span>
            )}
          </div>
          {liveData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                ['device_id', liveData.device_id],
                ['richter', liveData.richter?.toFixed(3)],
                ['pga', liveData.pga?.toFixed(4) + ' cm/s²'],
                ['accel_x', liveData.accel_x?.toFixed(4)],
                ['accel_y', liveData.accel_y?.toFixed(4)],
                ['accel_z', liveData.accel_z?.toFixed(4)],
                ['deprem_flag', String(liveData.deprem_flag)],
                ['server_timestamp', formatTime(liveData.server_timestamp)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{k}</span>
                  <span style={{ fontSize: '0.85rem', color: k === 'deprem_flag' && v === 'true' ? 'var(--accent-danger)' : 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{v ?? '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">MQTT verisi bekleniyor...</div>
            </div>
          )}
        </div>

        {/* System Health */}
        <SystemHealthWidget health={systemHealth} />
      </div>
    </div>
  )
}
