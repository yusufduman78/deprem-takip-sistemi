import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useEarthquake } from '../context/EarthquakeContext'
import { History, Search, FilterX, Database, AlertTriangle, CheckCircle2, Inbox } from 'lucide-react'
import gsap from 'gsap'

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
    <div className="page-container" ref={containerRef}>
      <div className="page-header reveal-el">
        <h1 className="page-title">
          <History size={32} className="text-secondary" />
          Geçmiş Deprem Verileri
        </h1>
        <p className="page-subtitle">Firebase /earthquake_events üzerindeki kalıcı kayıtlar</p>
      </div>

      {/* Filters */}
      <div className="filter-bar reveal-el" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 280 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="input"
            id="search-device"
            type="text"
            placeholder="Cihaz ID ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        
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
          style={{ width: '120px' }}
        />
        <input
          className="input"
          id="filter-date-from"
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          style={{ width: 'auto' }}
        />
        <input
          className="input"
          id="filter-date-to"
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          style={{ width: 'auto' }}
        />
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>
          <div className="toggle">
            <input type="checkbox" id="filter-alarm-only" checked={alarmOnly} onChange={e => setAlarmOnly(e.target.checked)} />
            <span className="toggle-slider"></span>
          </div>
          Sadece Alarmlar
        </label>
        
        <button
          className="btn"
          onClick={() => { setSearch(''); setMinRichter(''); setDateFrom(''); setDateTo(''); setAlarmOnly(false) }}
          style={{ marginLeft: 'auto' }}
        >
          <FilterX size={16} /> Sıfırla
        </button>
        
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
          <Database size={12} style={{ display: 'inline', marginRight: 4, transform: 'translateY(1px)' }} />
          {filtered.length} / {historicalEvents.length} kayıt
        </div>
      </div>

      {/* Table */}
      <div className="card reveal-el" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '6rem 0', textAlign: 'center' }}>
            <Inbox size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <div className="empty-state-text" style={{ color: 'var(--text-muted)' }}>
              {historicalEvents.length === 0 ? 'Firebase\'de henüz kayıt yok' : 'Filtreyle eşleşen kayıt bulunamadı'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <th style={{ paddingLeft: '1.75rem' }}>Durum</th>
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
                {filtered.map((ev, i) => {
                  const ts = ev.server_timestamp || ev.timestamp
                  return (
                    <tr key={ev.id} className="table-row" style={{ animationDelay: `${i * 0.05}s` }}>
                      <td style={{ paddingLeft: '1.75rem' }}>
                        {ev.deprem_flag
                          ? <span className="badge badge-alarm"><AlertTriangle size={12}/> DEPREM</span>
                          : <span className="badge badge-normal"><CheckCircle2 size={12}/> NORMAL</span>
                        }
                      </td>
                      <td className="mono" style={{ color: 'var(--text-secondary)' }}>{ev.device_id || '—'}</td>
                      <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{fmt(ts)}</td>
                      <td>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          color: ev.richter >= 4 ? 'var(--accent-danger)' : ev.richter >= 2 ? 'var(--accent-warning)' : 'var(--text-primary)',
                          textShadow: ev.richter >= 4 ? '0 0 10px rgba(255,0,60,0.4)' : 'none'
                        }}>
                          {ev.richter?.toFixed(2) ?? '—'}
                        </span>
                      </td>
                      <td className="mono" style={{ color: 'var(--text-secondary)' }}>{ev.pga?.toFixed(4) ?? '—'}</td>
                      <td className="mono" style={{ color: '#00f0ff' }}>{ev.accel_x?.toFixed(3) ?? '—'}</td>
                      <td className="mono" style={{ color: '#00ff88' }}>{ev.accel_y?.toFixed(3) ?? '—'}</td>
                      <td className="mono" style={{ color: '#7000ff' }}>{ev.accel_z?.toFixed(3) ?? '—'}</td>
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
