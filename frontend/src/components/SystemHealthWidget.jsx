import React from 'react'

export default function SystemHealthWidget({ health }) {
  if (!health) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title">🔧 Sistem Sağlığı</div>
          <span className="badge badge-warning">Bridge Bekleniyor</span>
        </div>
        <div className="empty-state" style={{ padding: '2rem 0' }}>
          <div className="empty-state-icon">💤</div>
          <div className="empty-state-text">Watchdog telemetrisi bekleniyor...</div>
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
        <div className="card-title">🔧 Sistem Sağlığı (Bridge)</div>
        <span className={`badge ${statusOk ? 'badge-normal' : 'badge-alarm'}`}>
          {health.status || '—'}
        </span>
      </div>
      <div className="health-widget">
        <div className="health-item">
          <div className="health-key">CPU</div>
          <div className={`health-val ${health.cpu_percent > 80 ? 'warn' : 'ok'}`}>
            {health.cpu_percent?.toFixed(1) ?? '—'}%
          </div>
        </div>
        <div className="health-item">
          <div className="health-key">RAM</div>
          <div className={`health-val ${health.ram_mb > 200 ? 'warn' : 'ok'}`}>
            {health.ram_mb?.toFixed(0) ?? '—'} MB
          </div>
        </div>
        <div className="health-item">
          <div className="health-key">Uptime</div>
          <div className="health-val ok">
            {health.uptime_hours?.toFixed(1) ?? '—'}s
          </div>
        </div>
        <div className="health-item">
          <div className="health-key">Aktif Thread</div>
          <div className="health-val ok">
            {health.active_threads ?? '—'}
          </div>
        </div>
        <div className="health-item">
          <div className="health-key">Kuyruk</div>
          <div className={`health-val ${health.queue_size > 0 ? 'warn' : 'ok'}`}>
            {health.queue_size ?? 0} bekliyor
          </div>
        </div>
        <div className="health-item">
          <div className="health-key">Aktif Sensör</div>
          <div className="health-val ok">
            {health.active_sensors ?? '—'}
          </div>
        </div>
        <div className="health-item">
          <div className="health-key">Gecikme</div>
          <div className={`health-val ${health.network_latency_ms > 200 ? 'warn' : 'ok'}`}>
            {health.network_latency_ms ?? '—'} ms
          </div>
        </div>
        <div className="health-item">
          <div className="health-key">Durum</div>
          <div className={`health-val ${statusOk ? 'ok' : 'warn'}`}>
            {health.status || '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
