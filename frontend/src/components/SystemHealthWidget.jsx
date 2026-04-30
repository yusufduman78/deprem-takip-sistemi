import React from 'react'
import { Server, Activity, Timer, Cpu, MemoryStick, Hash, Network, AlertCircle } from 'lucide-react'

export default function SystemHealthWidget({ health }) {
  if (!health) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Server size={18} className="text-muted" />
            Sistem Sağlığı
          </div>
          <span className="badge badge-warning">Bridge Bekleniyor</span>
        </div>
        <div className="empty-state" style={{ padding: '3rem 0', textAlign: 'center' }}>
          <Timer size={32} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <div className="empty-state-text" style={{ color: 'var(--text-muted)' }}>Watchdog telemetrisi bekleniyor...</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Bridge her 60 saniyede system/health kanalına veri yayınlar
          </div>
        </div>
      </div>
    )
  }

  const statusOk = health.status === 'HEALTHY'

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Server size={18} className={statusOk ? "text-success" : "text-danger"} />
          Sistem Sağlığı (Bridge)
        </div>
        <span className={`badge ${statusOk ? 'badge-normal' : 'badge-alarm'}`}>
          {health.status || '—'}
        </span>
      </div>
      <div className="health-widget" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <div className="health-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}><Cpu size={14} /> CPU</div>
          <div style={{ fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', color: health.cpu_percent > 80 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
            {health.cpu_percent?.toFixed(1) ?? '—'}%
          </div>
        </div>
        <div className="health-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}><MemoryStick size={14} /> RAM</div>
          <div style={{ fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', color: health.ram_mb > 200 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>
            {health.ram_mb?.toFixed(0) ?? '—'} MB
          </div>
        </div>
        <div className="health-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}><Timer size={14} /> Uptime</div>
          <div style={{ fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
            {health.uptime_hours?.toFixed(1) ?? '—'}s
          </div>
        </div>
        <div className="health-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}><Activity size={14} /> Aktif Thread</div>
          <div style={{ fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
            {health.active_threads ?? '—'}
          </div>
        </div>
        <div className="health-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}><Hash size={14} /> Kuyruk</div>
          <div style={{ fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', color: health.queue_size > 0 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>
            {health.queue_size ?? 0}
          </div>
        </div>
        <div className="health-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}><Server size={14} /> Aktif Sensör</div>
          <div style={{ fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
            {health.active_sensors ?? '—'}
          </div>
        </div>
        <div className="health-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}><Network size={14} /> Ağ Gecikmesi (Latency)</div>
          <div style={{ fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', color: health.network_latency_ms > 200 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
            {health.network_latency_ms ?? '—'} ms
          </div>
        </div>
      </div>
    </div>
  )
}
