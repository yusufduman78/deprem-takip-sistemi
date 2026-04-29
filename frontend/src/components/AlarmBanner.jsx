import React from 'react'
import { useEarthquake } from '../context/EarthquakeContext'

export default function AlarmBanner() {
  const { liveData } = useEarthquake()
  const richter = liveData?.richter?.toFixed(1) ?? '—'
  const pga = liveData?.pga?.toFixed(3) ?? '—'
  const time = liveData?.server_timestamp || liveData?.timestamp
  const timeStr = time ? new Date(time).toLocaleTimeString('tr-TR') : '—'

  return (
    <div className="alarm-banner" role="alert" aria-live="assertive">
      <span className="alarm-banner-icon">🔴</span>
      <div className="alarm-banner-text">
        <div className="alarm-banner-title">⚠️ DEPREM ALARMI ALGILANDI</div>
        <div className="alarm-banner-details">
          Richter: <strong>{richter}</strong> &nbsp;|&nbsp; PGA: <strong>{pga} cm/s²</strong> &nbsp;|&nbsp; Saat: <strong>{timeStr}</strong>
        </div>
      </div>
      <span className="alarm-banner-icon">🔴</span>
    </div>
  )
}
