import React, { useEffect, useRef } from 'react'
import { useEarthquake } from '../context/EarthquakeContext'
import { AlertTriangle } from 'lucide-react'
import gsap from 'gsap'

export default function AlarmBanner() {
  const { liveData } = useEarthquake()
  const bannerRef = useRef(null)

  useEffect(() => {
    if (bannerRef.current) {
      gsap.fromTo(bannerRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
      )
    }
  }, [])

  const richter = liveData?.richter?.toFixed(1) ?? '—'
  const pga = liveData?.pga?.toFixed(3) ?? '—'
  const time = liveData?.server_timestamp || liveData?.timestamp
  const timeStr = time ? new Date(time).toLocaleTimeString('tr-TR') : '—'

  return (
    <div className="alarm-banner" role="alert" aria-live="assertive" ref={bannerRef}>
      <AlertTriangle size={28} className="alarm-banner-icon" />
      <div className="alarm-banner-text">
        <div className="alarm-banner-title">DEPREM ALARMI ALGILANDI</div>
        <div className="alarm-banner-details">
          Richter: <strong>{richter}</strong> &nbsp;|&nbsp; PGA: <strong>{pga} cm/s²</strong> &nbsp;|&nbsp; Saat: <strong>{timeStr}</strong>
        </div>
      </div>
      <AlertTriangle size={28} className="alarm-banner-icon" />
    </div>
  )
}
