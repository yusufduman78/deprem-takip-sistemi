import React, { useState, useMemo } from 'react'
import { useEarthquake } from '../context/EarthquakeContext'

function fmt(ts) {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString('tr-TR') } catch { return ts }
}

export default function EventHistory() {
  const { historicalEvents } = useEarthquake()
  const [search, setSearch] = useState('')
  const [minRichter, setMinRichter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [alarmOnly, setAlarmOnly] = useState(false)

  const filtered = useMemo(() => {
    return historicalEvents.filter(ev => {
      if (search && !ev.device_id?.toLowerCase().includes(search.toLowerCase())) return false
      if (minRichter && (ev.richter ?? 0) < parseFloat(minRichter)) return false
      if (alarmOnly && !ev.deprem_flag) return false
      const ts = ev.server_timestamp || ev.timestamp
      if (dateFrom && ts && new Date(ts) < new Date(dateFrom)) return false
      if (dateTo && ts && new Date(ts) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [historicalEvents, search, minRichter, dateFrom, dateTo, alarmOnly])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📋 Geçmiş Deprem Verileri</h1>
        <p className="page-subtitle">Firebase /earthquake_events üzerindeki kalıcı kayıtlar</p>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="input"
          id="search-device"
          type="text"
          placeholder="🔍 Cihaz ID ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 220 }}
        />
        <input
          className="input"
          id="filter-richter"
          type="number"
          step="0.1"
          min="0"
          max="10"
          placeholder="Min Richter"
          value={minRichter}
          onChange={e => setMinRichter(e.target.value)}
          style={{ maxWidth: 140 }}
        />
        <input
          className="input"
          id="filter-date-from"
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          style={{ maxWidth: 160 }}
        />
        <input
          className="input"
          id="filter-date-to"
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          style={{ maxWidth: 160 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            id="filter-alarm-only"
            checked={alarmOnly}
            onChange={e => setAlarmOnly(e.target.checked)}
          />
          Sadece Alarmlar
        </label>
        <button
          className="btn btn-outline"
          onClick={() => { setSearch(''); setMinRichter(''); setDateFrom(''); setDateTo(''); setAlarmOnly(false) }}
        >
          Sıfırla
        </button>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filtered.length} / {historicalEvents.length} kayıt
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-text">
              {historicalEvents.length === 0 ? 'Firebase\'de henüz kayıt yok' : 'Filtreyle eşleşen kayıt bulunamadı'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Cihaz ID</th>
                  <th>Tarih / Saat</th>
                  <th>Richter</th>
                  <th>PGA (cm/s²)</th>
                  <th>Accel X</th>
                  <th>Accel Y</th>
                  <th>Accel Z</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ev => {
                  const ts = ev.server_timestamp || ev.timestamp
                  return (
                    <tr key={ev.id}>
                      <td>
                        {ev.deprem_flag
                          ? <span className="badge badge-alarm">🚨 DEPREM</span>
                          : <span className="badge badge-normal">✅ Normal</span>
                        }
                      </td>
                      <td className="mono" style={{ color: 'var(--text-secondary)' }}>{ev.device_id || '—'}</td>
                      <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{fmt(ts)}</td>
                      <td>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          color: ev.richter >= 4 ? 'var(--accent-danger)' : ev.richter >= 2 ? 'var(--accent-warning)' : 'var(--text-primary)'
                        }}>
                          {ev.richter?.toFixed(2) ?? '—'}
                        </span>
                      </td>
                      <td className="mono">{ev.pga?.toFixed(4) ?? '—'}</td>
                      <td className="mono" style={{ color: '#3b82f6' }}>{ev.accel_x?.toFixed(3) ?? '—'}</td>
                      <td className="mono" style={{ color: '#10b981' }}>{ev.accel_y?.toFixed(3) ?? '—'}</td>
                      <td className="mono" style={{ color: '#a855f7' }}>{ev.accel_z?.toFixed(3) ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
