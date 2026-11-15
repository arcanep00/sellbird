import React, { useEffect, useState } from 'react'

export default function Dashboard() {
  const [health, setHealth] = useState(null)
  const [prospects, setProspects] = useState([])
  const [products, setProducts] = useState([])
  const [queue, setQueue] = useState({ queued: 0 })

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => {})
    fetch('/api/prospects').then(r => r.json()).then(d => setProspects(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/queue').then(r => r.json()).then(setQueue).catch(() => {})
  }, [])

  const ollamaUp = health?.ollama === 'ok'
  const backend = health?.backend || 'ollama'

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Your local AI sales agent — all inference runs on this machine</p>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="card-title">AI Backend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span className={`status-dot ${ollamaUp ? 'dot-green' : 'dot-red'}`} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {health ? (ollamaUp ? (backend === 'lmstudio' ? 'LM Studio' : 'Ollama') : 'Offline') : '—'}
            </span>
          </div>
          {ollamaUp && health?.recommended_model && (
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {health.recommended_model.model}
            </div>
          )}
          {!ollamaUp && health && (
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              Open LM Studio → Local Model API → enable server
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Prospects</div>
          <div className="card-value">{prospects.length}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>in pipeline</div>
        </div>

        <div className="card">
          <div className="card-title">Products</div>
          <div className="card-value">{products.length}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>configured</div>
        </div>
      </div>

      {!ollamaUp && health && (
        <div className="card" style={{ borderColor: '#5c1a1a', background: '#130808', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" style={{ marginTop: 2, flexShrink: 0 }}>
              <path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
              <path d="M12 9v4M12 17h.01"/>
            </svg>
            <div>
              <div style={{ color: '#f87171', fontWeight: 600, marginBottom: 6 }}>AI backend is not running</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Open LM Studio, go to Local Model API, and enable the server. All AI workflows require a running local model.
              </p>
            </div>
          </div>
        </div>
      )}

      {queue.queued > 0 && (
        <div className="card" style={{ borderColor: '#5c3a00', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="status-dot dot-yellow" />
            <span style={{ fontWeight: 600, color: 'var(--yellow)' }}>{queue.queued} task{queue.queued > 1 ? 's' : ''} queued</span>
            <span className="muted" style={{ fontSize: 13 }}>— will run automatically when the AI backend comes back online</span>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h2>Hardware</h2>
          {health?.hardware ? (
            <table className="table" style={{ marginTop: 8 }}>
              <tbody>
                <tr>
                  <td className="muted" style={{ width: 140 }}>RAM</td>
                  <td style={{ fontWeight: 500 }}>{health.hardware.ram_gb} GB</td>
                </tr>
                <tr>
                  <td className="muted">CPU cores</td>
                  <td style={{ fontWeight: 500 }}>{health.hardware.cpu_cores}</td>
                </tr>
                <tr>
                  <td className="muted">GPU VRAM</td>
                  <td style={{ fontWeight: 500 }}>
                    {health.hardware.gpu_vram_gb > 0 ? `${health.hardware.gpu_vram_gb} GB` : 'None detected'}
                  </td>
                </tr>
                <tr>
                  <td className="muted">Recommended model</td>
                  <td><span className="tag">{health.recommended_model?.model || '—'}</span></td>
                </tr>
                <tr>
                  <td className="muted">Config tier</td>
                  <td><span className="tag">{health.recommended_model?.config || '—'}</span></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              {health === null ? 'Connecting to backend...' : 'Could not reach the API server.'}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {[
              { href: '/products', label: 'Configure products & ICP' },
              { href: '/prospects', label: 'Score & prioritize prospects' },
              { href: '/email', label: 'Generate personalized emails' },
              { href: '/discover', label: 'Discover new prospects' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}>
                  {item.label}
                </button>
              </a>
            ))}
          </div>
        </div>
      </div>

      {ollamaUp && health?.models?.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 10 }}>Loaded Models</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {health.models.map((m, i) => (
              <span key={i} className="tag" style={{ fontSize: 12 }}>{m}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
