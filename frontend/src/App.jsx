import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { EarthquakeProvider, useEarthquake } from './context/EarthquakeContext'
import Navbar from './components/Navbar'
import AlarmBanner from './components/AlarmBanner'
import OfflineBanner from './components/OfflineBanner'
import LiveMonitor from './pages/LiveMonitor'
import EventHistory from './pages/EventHistory'
import Statistics from './pages/Statistics'
import NotificationSettings from './pages/NotificationSettings'

function AppInner() {
  const { isAlarm, mqttStatus } = useEarthquake()

  return (
    <div className={`app-layout ${isAlarm ? 'alarm-mode' : ''}`}>
      <Navbar />
      {isAlarm && <AlarmBanner />}
      {(mqttStatus === 'disconnected') && <OfflineBanner />}
      <main className="main-content" style={{ paddingTop: isAlarm ? 'calc(var(--navbar-height) + 72px)' : 'var(--navbar-height)' }}>
        <Routes>
          <Route path="/" element={<LiveMonitor />} />
          <Route path="/history" element={<EventHistory />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/settings" element={<NotificationSettings />} />
        </Routes>
      </main>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="dark"
        style={{ zIndex: 9999 }}
      />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <EarthquakeProvider>
        <AppInner />
      </EarthquakeProvider>
    </BrowserRouter>
  )
}
