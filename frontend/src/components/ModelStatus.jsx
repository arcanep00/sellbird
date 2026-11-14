import React, { useEffect, useState } from 'react'

export default function ModelStatus() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => { setStatus(data); setLoading(false) })
      .catch(() => { setStatus({ ollama: 'unavailable' }); setLoading(false) })
  }, [])

  if (loading) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Checking model...</div>
  }

  const up = status?.ollama === 'ok'
  const backend = status?.backend || 'ollama'

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ marginBottom: 6 }}>
        <span className={`status-dot ${up ? 'dot-green' : 'dot-red'}`} />
        <span style={{ color: up ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
          {up ? (backend === 'lmstudio' ? 'LM Studio' : 'Ollama') + ' running' : 'AI offline'}
        </span>
      </div>
      {up && status?.recommended_model && (
        <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <div>Model: <span style={{ color: 'var(--text)' }}>{status.recommended_model.model}</span></div>
          <div>RAM: {status.hardware?.ram_gb}GB</div>
          {status.hardware?.gpu_vram_gb > 0 && (
            <div>GPU: {status.hardware.gpu_vram_gb}GB VRAM</div>
          )}
        </div>
      )}
      {!up && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
          Start LM Studio → Local Model API → enable server
        </div>
      )}
    </div>
  )
}
