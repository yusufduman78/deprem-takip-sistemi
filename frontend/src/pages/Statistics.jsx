import React, { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { useEarthquake } from '../context/EarthquakeContext'

function fmt(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(19,24,36,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{Number(p.value).toFixed(3)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function Statistics() {
  const { historicalEvents } = useEarthquake()

  // Aggregate statistics
  const stats = useMemo(() => {
    const events = historicalEvents.filter(e => e.richter != null)
    if (!events.length) return null

    const richters = events.map(e => e.richter)
    const pgas = events.map(e => e.pga ?? 0)
    const alarms = events.filter(e => e.deprem_flag)
    const max = Math.max(...richters)
    const avg = richters.reduce((a, b) => a + b, 0) / richters.length

    // Last 7 days
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 3600 * 1000
    const last7 = events.filter(e => {
      const ts = e.server_timestamp || e.timestamp
      return ts && new Date(ts).getTime() >= sevenDaysAgo
    })
    const avg7 = last7.length
      ? last7.reduce((a, b) => a + (b.richter || 0), 0) / last7.length
      : 0

    return { total: events.length, alarmCount: alarms.length, max, avg, avg7, events, pgas }
  }, [historicalEvents])

  // Time-series data (sorted by timestamp, latest 100)
  const timeSeriesData = useMemo(() => {
    return historicalEvents
      .filter(e => e.richter != null && (e.server_timestamp || e.timestamp))
      .slice(0, 100)
      .reverse()
      .map(e => ({
        label: fmt(e.server_timestamp || e.timestamp),
        richter: e.richter,
        pga: e.pga ?? 0,
      }))
  }, [historicalEvents])

  // Richter histogram (buckets: 0-1, 1-2, 2-3, 3-4, 4-5, 5+)
  const histData = useMemo(() => {
    const buckets = [
      { range: '0-1', count: 0 },
      { range: '1-2', count: 0 },
      { range: '2-3', count: 0 },
      { range: '3-4', count: 0 },
      { range: '4-5', count: 0 },
      { range: '5+', count: 0 },
    ]
    historicalEvents.forEach(e => {
      const r = e.richter ?? 0
      if (r < 1) buckets[0].count++
      else if (r < 2) buckets[1].count++
      else if (r < 3) buckets[2].count++
      else if (r < 4) buckets[3].count++
      else if (r < 5) buckets[4].count++
      else buckets[5].count++
    })
    return buckets
  }, [historicalEvents])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📊 İstatistikler</h1>
        <p className="page-subtitle">Firebase kayıtlarına dayalı grafiksel analiz</p>
      </div>

      {/* Summary Stats */}
      <div className="stat-cards-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-primary)', '--stat-icon-bg': 'rgba(59,130,246,0.1)' }}>
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-label">Toplam Kayıt</div>
            <div className="stat-value">{stats?.total ?? 0}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-danger)', '--stat-icon-bg': 'rgba(239,68,68,0.1)' }}>
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <div className="stat-label">Deprem Sayısı</div>
            <div className="stat-value" style={{ color: 'var(--accent-danger)' }}>{stats?.alarmCount ?? 0}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-warning)', '--stat-icon-bg': 'rgba(245,158,11,0.1)' }}>
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-label">En Büyük Deprem</div>
            <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>
              {stats?.max?.toFixed(2) ?? '—'}
            </div>
            <div className="stat-sub">Richter</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-success)', '--stat-icon-bg': 'rgba(16,185,129,0.1)' }}>
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-label">Son 7 Gün Ort.</div>
            <div className="stat-value" style={{ color: 'var(--accent-success)' }}>
              {stats?.avg7?.toFixed(2) ?? '—'}
            </div>
            <div className="stat-sub">Richter ort.</div>
          </div>
        </div>
      </div>

      {!stats ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">İstatistik için Firebase verisi bekleniyor...</div>
          </div>
        </div>
      ) : (
        <>
          {/* Richter over time */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div className="card-title">📉 Richter Zaman Grafiği</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Son 100 olay</div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} interval="preserveStartEnd" minTickGap={30} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="richter" stroke="#f59e0b" strokeWidth={2} dot={false} name="Richter" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* PGA over time */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div className="card-title">📡 PGA Zaman Grafiği</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Son 100 olay</div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} interval="preserveStartEnd" minTickGap={30} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="pga" stroke="#3b82f6" strokeWidth={2} dot={false} name="PGA" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Richter Histogram */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📊 Richter Dağılımı (Histogram)</div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={histData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="range" tick={{ fill: '#475569', fontSize: 11 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => active && payload?.length ? (
                    <div style={{ background: 'rgba(19,24,36,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                      <div style={{ color: '#94a3b8' }}>Richter {label}</div>
                      <div style={{ color: '#6366f1', fontWeight: 700 }}>{payload[0].value} olay</div>
                    </div>
                  ) : null}
                />
                <Bar dataKey="count" fill="#6366f1" name="Olay Sayısı" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
