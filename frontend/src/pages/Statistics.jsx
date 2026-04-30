import React, { useMemo, useEffect, useRef } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { useEarthquake } from '../context/EarthquakeContext'
import { BarChart3, Package, AlertTriangle, Zap, TrendingUp, LineChart as ChartIcon, Radio, ListEnd } from 'lucide-react'
import gsap from 'gsap'

function fmt(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(10, 10, 12, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <div style={{ color: '#a1a1aa', marginBottom: 8, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <span>{p.name}</span>
          <strong>{Number(p.value).toFixed(3)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function Statistics() {
  const { historicalEvents } = useEarthquake()
  const containerRef = useRef(null)

  useEffect(() => {
    // GSAP Reveal Animation
    const ctx = gsap.context(() => {
      gsap.fromTo('.reveal-el', 
        { y: 30, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out' }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

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
    <div className="page-container" ref={containerRef}>
      <div className="page-header reveal-el">
        <h1 className="page-title">
          <BarChart3 size={32} className="text-primary" />
          İstatistikler
        </h1>
        <p className="page-subtitle">Firebase kayıtlarına dayalı grafiksel analiz</p>
      </div>

      {/* Summary Stats */}
      <div className="stat-cards-grid reveal-el" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-primary)' }}>
          <div className="stat-icon"><Package size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Toplam Kayıt</div>
            <div className="stat-value">{stats?.total ?? 0}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-danger)' }}>
          <div className="stat-icon"><AlertTriangle size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Deprem Sayısı</div>
            <div className="stat-value" style={{ color: 'var(--accent-danger)' }}>{stats?.alarmCount ?? 0}</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-warning)' }}>
          <div className="stat-icon"><Zap size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">En Büyük Deprem</div>
            <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>
              {stats?.max?.toFixed(2) ?? '—'}
            </div>
            <div className="stat-sub">Richter</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-success)' }}>
          <div className="stat-icon"><TrendingUp size={24} /></div>
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
        <div className="card reveal-el">
          <div className="empty-state" style={{ padding: '6rem 0', textAlign: 'center' }}>
            <BarChart3 size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <div className="empty-state-text" style={{ color: 'var(--text-muted)' }}>İstatistik için Firebase verisi bekleniyor...</div>
          </div>
        </div>
      ) : (
        <>
          {/* Richter over time */}
          <div className="card reveal-el" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div className="card-title">
                <ChartIcon size={18} className="text-warning" />
                Richter Zaman Grafiği
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Son 100 olay</div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#52525b', fontSize: 11 }} interval="preserveStartEnd" minTickGap={40} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 11 }} domain={[0, 'auto']} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="richter" stroke="#ffb800" strokeWidth={2} dot={false} name="Richter" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* PGA over time */}
          <div className="card reveal-el" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div className="card-title">
                <Radio size={18} className="text-primary" />
                PGA Zaman Grafiği
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Son 100 olay</div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#52525b', fontSize: 11 }} interval="preserveStartEnd" minTickGap={40} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="pga" stroke="#00f0ff" strokeWidth={2} dot={false} name="PGA" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Richter Histogram */}
          <div className="card reveal-el">
            <div className="card-header">
              <div className="card-title">
                <ListEnd size={18} className="text-secondary" />
                Richter Dağılımı (Histogram)
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={histData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="range" tick={{ fill: '#52525b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 11 }} allowDecimals={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ active, payload, label }) => active && payload?.length ? (
                    <div style={{ background: 'rgba(10, 10, 12, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                      <div style={{ color: '#a1a1aa', marginBottom: 4 }}>Richter {label}</div>
                      <div style={{ color: '#7000ff', fontWeight: 700, fontSize: '14px' }}>{payload[0].value} olay</div>
                    </div>
                  ) : null}
                />
                <Bar dataKey="count" fill="#7000ff" name="Olay Sayısı" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
