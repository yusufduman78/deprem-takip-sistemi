import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useEarthquake } from '../context/EarthquakeContext'
import { Activity, History, BarChart3, Settings, Globe2, Wifi, WifiOff, Sun, Moon, Menu, X } from 'lucide-react'

const STATUS_LABELS = {
  connected: 'Bağlı',
  connecting: 'Bağlanıyor...',
  reconnecting: 'Yeniden Bağlanıyor',
  disconnected: 'Bağlantı Yok',
}

export default function Navbar() {
  const { mqttStatus, isAlarm } = useEarthquake()
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      <nav className={`navbar ${isAlarm ? 'alarm' : ''}`}>
        <NavLink to="/" className="navbar-brand" onClick={closeMobile}>
          <div className="brand-icon">
            <Globe2 size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="brand-text">DTS</span>
            <span className="brand-sub">Deprem Takip Sistemi</span>
          </div>
        </NavLink>

        {/* Desktop Nav */}
        <div className="navbar-nav desktop-nav">
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

        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={toggleTheme} 
            className="theme-toggle-btn"
            title={theme === 'dark' ? "Aydınlık Mod" : "Karanlık Mod"}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className={`status-badge ${mqttStatus} desktop-only`}>
            {mqttStatus === 'connected' ? (
              <Wifi size={14} className="status-dot" />
            ) : (
              <WifiOff size={14} className="status-dot" />
            )}
            <span>{STATUS_LABELS[mqttStatus] || 'Bilinmiyor'}</span>
          </div>
          {/* Mobile hamburger */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menü aç/kapat"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && <div className="mobile-overlay" onClick={closeMobile} />}
      <div className={`mobile-drawer ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-status">
          <div className={`status-badge ${mqttStatus}`} style={{ width: '100%', justifyContent: 'center' }}>
            {mqttStatus === 'connected' ? <Wifi size={14} className="status-dot" /> : <WifiOff size={14} className="status-dot" />}
            <span>{STATUS_LABELS[mqttStatus] || 'Bilinmiyor'}</span>
          </div>
        </div>
        <NavLink to="/" end className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
          <Activity size={20} /> Canlı İzleme
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
          <History size={20} /> Geçmiş
        </NavLink>
        <NavLink to="/statistics" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
          <BarChart3 size={20} /> İstatistik
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} onClick={closeMobile}>
          <Settings size={20} /> Ayarlar
        </NavLink>
      </div>
    </>
  )
}
