import React from 'react'

export default function OfflineBanner() {
  return (
    <div className="offline-banner" role="status">
      <span>⚠️</span>
      <span>MQTT bağlantısı kesildi — yeniden bağlanmaya çalışılıyor</span>
    </div>
  )
}
