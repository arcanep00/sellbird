import React, { useEffect, useState } from 'react'

export default function ModelStatus() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ ollama: 'unavailable' }))
  }, [])

  if (!status) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connecting...</div>
  }

  const up = status?.ollama === 'ok'
  const backend = status?.backend === 'lmstudio' ? 'LM Studio' : 'Ollama'

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span className={`status-dot ${up ? 'dot-green' : 'dot-red'}`} />
        <span style={{ color: up ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
          {up ? `${backend} running` : 'AI offline'}
        </span>
      </div>
      {up && (
        <div style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
          {status.recommended_model?.model && (
            <div style={{ color: 'var(--text)', fontSize: 11 }}>
              {status.recommended_model.model}
            </div>
          )}
          <div>RAM: {status.hardware?.ram_gb} GB</div>
          {status.hardware?.gpu_vram_gb > 0 && (
            <div>GPU: {status.hardware.gpu_vram_gb} GB VRAM</div>
          )}
        </div>
      )}
      {!up && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.5 }}>
          Open LM Studio<br />Local Model API → ON
        </div>
      )}
    </div>
  )
}
