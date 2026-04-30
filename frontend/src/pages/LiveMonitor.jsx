import React, { useMemo, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { useEarthquake } from '../context/EarthquakeContext'
import SystemHealthWidget from '../components/SystemHealthWidget'
import { Activity, AlertTriangle, CheckCircle2, Ruler, Radio, Clock, Plug, ArrowUpCircle, ArrowRightCircle, ArrowDownCircle, LineChart as ChartIcon, Package, Mailbox } from 'lucide-react'
import gsap from 'gsap'

// Format time for X-axis tick
function formatTime(ts) {
  if (!ts) return ''
  try {
    const timeNum = Number(ts)
    let d
    if (!isNaN(timeNum)) {
      if (timeNum < 20000000000) d = new Date(timeNum * 1000) // seconds to ms
      else d = new Date(timeNum) // already ms
    } else {
      d = new Date(ts)
    }
    if (isNaN(d.getTime())) return String(ts)
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return String(ts)
  }
}

// Custom tooltip for chart
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10, 10, 12, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    }}>
      <div style={{ color: '#a1a1aa', marginBottom: 8, fontWeight: 600 }}>{formatTime(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <span>{p.name}</span>
          <strong>{Number(p.value).toFixed(3)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function LiveMonitor() {
  const { liveData, isAlarm, graphPoints, systemHealth } = useEarthquake()
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

  const lastTime = liveData?.server_timestamp || liveData?.timestamp
  const timeStr = lastTime ? new Date(lastTime).toLocaleString('tr-TR') : '—'

  // Enrich graph points with readable time label
  const chartData = useMemo(() =>
    graphPoints.map(p => ({ ...p, _label: formatTime(p.time) })),
    [graphPoints]
  )

  return (
    <div className="page-container" ref={containerRef}>
      {/* Page Header */}
      <div className="page-header reveal-el">
        <h1 className="page-title">
          <Activity size={32} className="text-primary" />
          Canlı İzleme
        </h1>
        <p className="page-subtitle">Gerçek zamanlı sensör verileri — MQTT üzerinden köprü çıkışı dinleniyor</p>
      </div>

      {/* Stat Cards Row */}
      <div className="stat-cards-grid reveal-el">
        {/* System Status */}
        <div className="stat-card" style={{ '--stat-color': isAlarm ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
          <div className="stat-icon">
            {isAlarm ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div className="stat-content">
            <div className="stat-label">Sistem Durumu</div>
            <div className={`system-status ${isAlarm ? 'alarm' : 'normal'}`} style={{ marginTop: 8 }}>
              {isAlarm ? '⚠ DEPREM ALARMI' : '◉ NORMAL'}
            </div>
          </div>
        </div>

        {/* PGA */}
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-primary)' }}>
          <div className="stat-icon"><Radio size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Son PGA</div>
            <div className="stat-value" style={{ color: 'var(--accent-primary)', fontSize: '1.75rem' }}>
              {liveData?.pga?.toFixed(4) ?? '—'}
            </div>
            <div className="stat-sub">cm/s²</div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-secondary)' }}>
          <div className="stat-icon"><Clock size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Son Olay Zamanı</div>
            <div className="stat-value mono" style={{ color: 'var(--accent-secondary)', fontSize: '1rem', marginTop: 4 }}>
              {timeStr}
            </div>
          </div>
        </div>

        {/* Device ID */}
        <div className="stat-card" style={{ '--stat-color': 'var(--text-muted)' }}>
          <div className="stat-icon"><Plug size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Cihaz ID</div>
            <div className="stat-value mono" style={{ fontSize: '1.25rem', marginTop: 4, color: 'var(--text-primary)' }}>
              {liveData?.device_id ?? '—'}
            </div>
          </div>
        </div>

        {/* Richter */}
        <div className="stat-card" style={{ '--stat-color': 'var(--accent-warning)' }}>
          <div className="stat-icon"><Ruler size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Son Richter</div>
            <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>
              {liveData?.richter?.toFixed(2) ?? '—'}
            </div>
            <div className="stat-sub">Büyüklük</div>
          </div>
        </div>

        {/* Accel X */}
        <div className="stat-card" style={{ '--stat-color': '#00f0ff' }}>
          <div className="stat-icon"><ArrowRightCircle size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Accel X (Yatay)</div>
            <div className="stat-value mono" style={{ color: '#00f0ff' }}>
              {liveData?.accel_x?.toFixed(3) ?? '—'}
            </div>
            <div className="stat-sub">m/s²</div>
          </div>
        </div>

        {/* Accel Y */}
        <div className="stat-card" style={{ '--stat-color': '#00ff88' }}>
          <div className="stat-icon"><ArrowDownCircle size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Accel Y (Yanal)</div>
            <div className="stat-value mono" style={{ color: '#00ff88' }}>
              {liveData?.accel_y?.toFixed(3) ?? '—'}
            </div>
            <div className="stat-sub">m/s²</div>
          </div>
        </div>

        {/* Accel Z */}
        <div className="stat-card" style={{ '--stat-color': '#a855f7' }}>
          <div className="stat-icon"><ArrowUpCircle size={24} /></div>
          <div className="stat-content">
            <div className="stat-label">Accel Z (Dikey)</div>
            <div className="stat-value mono" style={{ color: '#a855f7' }}>
              {liveData?.accel_z?.toFixed(3) ?? '—'}
            </div>
            <div className="stat-sub">m/s²</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid-2 reveal-el" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Live Accelerometer Chart */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div className="card-title">
              <ChartIcon size={18} className="text-primary" />
              Canlı İvmeölçer Grafiği
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Son {Math.min(graphPoints.length, 60)} nokta
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="empty-state" style={{ padding: '4rem 0', textAlign: 'center' }}>
              <Radio size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <div className="empty-state-text" style={{ color: 'var(--text-muted)' }}>Sensör verisi bekleniyor...</div>
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
                    formatter={(value) => value === 'accel_x' ? 'Accel X' : value === 'accel_y' ? 'Accel Y' : value === 'accel_z' ? 'Accel Z' : value === 'richter' ? 'Richter' : value}
                  />
                  <Line type="monotone" dataKey="accel_x" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="accel_x" isAnimationActive={false} />
                  <Line type="monotone" dataKey="accel_y" stroke="#10b981" strokeWidth={1.5} dot={false} name="accel_y" isAnimationActive={false} />
                  <Line type="monotone" dataKey="accel_z" stroke="#a855f7" strokeWidth={1.5} dot={false} name="accel_z" isAnimationActive={false} />
                  <Line type="monotone" dataKey="richter" stroke="#ffb800" strokeWidth={2.5} dot={false} name="richter" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2 reveal-el" style={{ gap: '1.5rem' }}>
        {/* Latest packet raw data */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Package size={18} className="text-secondary" />
              Son MQTT Paketi
            </div>
            {liveData?.deprem_flag && (
              <span className="badge badge-alarm"><AlertTriangle size={12}/> DEPREM</span>
            )}
          </div>
          {liveData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{k}</span>
                  <span style={{ fontSize: '0.9rem', color: k === 'deprem_flag' && v === 'true' ? 'var(--accent-danger)' : 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{v ?? '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '3rem 0', textAlign: 'center' }}>
              <Mailbox size={32} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <div className="empty-state-text" style={{ color: 'var(--text-muted)' }}>MQTT verisi bekleniyor...</div>
            </div>
          )}
        </div>

        {/* System Health */}
        <SystemHealthWidget health={systemHealth} />
      </div>
    </div>
  )
}
