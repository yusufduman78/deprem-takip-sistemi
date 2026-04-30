import React from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  return (
    <div className="offline-banner" role="status" style={{ 
      position: 'fixed', bottom: 0, left: 0, right: 0, 
      background: 'rgba(255, 0, 60, 0.9)', color: 'white',
      padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem',
      fontWeight: 600, fontSize: '0.85rem', zIndex: 1000,
      backdropFilter: 'blur(10px)'
    }}>
      <WifiOff size={16} />
      <span>MQTT bağlantısı kesildi — yeniden bağlanmaya çalışılıyor</span>
    </div>
  )
}
