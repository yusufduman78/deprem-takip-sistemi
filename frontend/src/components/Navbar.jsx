import React from 'react'
import { NavLink } from 'react-router-dom'
import { useEarthquake } from '../context/EarthquakeContext'

const STATUS_LABELS = {
  connected: 'Bağlı',
  connecting: 'Bağlanıyor...',
  reconnecting: 'Yeniden Bağlanıyor',
  disconnected: 'Bağlantı Yok',
}

export default function Navbar() {
  const { mqttStatus, isAlarm } = useEarthquake()

  return (
    <nav className={`navbar ${isAlarm ? 'alarm' : ''}`}>
      <NavLink to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
        <div className="brand-icon">🌍</div>
        <div>
          <span className="brand-text">DTS</span>
          <span className="brand-sub">Deprem Takip Sistemi</span>
        </div>
      </NavLink>

      <div className="navbar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📡</span>
          <span>Canlı İzleme</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📋</span>
          <span>Geçmiş</span>
        </NavLink>
        <NavLink to="/statistics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📊</span>
          <span>İstatistik</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">⚙️</span>
          <span>Ayarlar</span>
        </NavLink>
      </div>

      <div className="navbar-right">
        <div className={`status-badge ${mqttStatus}`}>
          <div className="status-dot" />
          <span>{STATUS_LABELS[mqttStatus] || 'Bilinmiyor'}</span>
        </div>
      </div>
    </nav>
  )
}
