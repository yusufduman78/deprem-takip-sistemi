import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useEarthquake } from '../context/EarthquakeContext'
import { Activity, History, BarChart3, Settings, Globe2, Wifi, WifiOff, Sun, Moon } from 'lucide-react'

const STATUS_LABELS = {
  connected: 'Bağlı',
  connecting: 'Bağlanıyor...',
  reconnecting: 'Yeniden Bağlanıyor',
  disconnected: 'Bağlantı Yok',
}

export default function Navbar() {
  const { mqttStatus, isAlarm } = useEarthquake()
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  return (
    <nav className={`navbar ${isAlarm ? 'alarm' : ''}`}>
      <NavLink to="/" className="navbar-brand">
        <div className="brand-icon">
          <Globe2 size={20} strokeWidth={2.5} />
        </div>
        <div>
          <span className="brand-text">DTS</span>
          <span className="brand-sub">Deprem Takip Sistemi</span>
        </div>
      </NavLink>

      <div className="navbar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Activity className="nav-icon" size={18} strokeWidth={2} />
          <span>Canlı İzleme</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <History className="nav-icon" size={18} strokeWidth={2} />
          <span>Geçmiş</span>
        </NavLink>
        <NavLink to="/statistics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <BarChart3 className="nav-icon" size={18} strokeWidth={2} />
          <span>İstatistik</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings className="nav-icon" size={18} strokeWidth={2} />
          <span>Ayarlar</span>
        </NavLink>
      </div>

      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={toggleTheme} 
          style={{ 
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '50%',
            transition: 'var(--transition)'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          title={theme === 'dark' ? "Aydınlık Mod" : "Karanlık Mod"}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className={`status-badge ${mqttStatus}`}>
          {mqttStatus === 'connected' ? (
            <Wifi size={14} className="status-dot" />
          ) : (
            <WifiOff size={14} className="status-dot" />
          )}
          <span>{STATUS_LABELS[mqttStatus] || 'Bilinmiyor'}</span>
        </div>
      </div>
    </nav>
  )
}

