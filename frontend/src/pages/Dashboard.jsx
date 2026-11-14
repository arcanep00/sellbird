import React, { useEffect, useState } from 'react'

export default function Dashboard() {
  const [health, setHealth] = useState(null)
  const [prospects, setProspects] = useState([])
  const [products, setProducts] = useState([])
  const [queue, setQueue] = useState({ queued: 0 })

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => {})
    fetch('/api/prospects').then(r => r.json()).then(setProspects).catch(() => {})
    fetch('/api/products').then(r => r.json()).then(setProducts).catch(() => {})
    fetch('/api/queue').then(r => r.json()).then(setQueue).catch(() => {})
  }, [])

  const ollamaUp = health?.ollama === 'ok'

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Your local AI sales agent overview</p>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="card-title">Ollama Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span className={`status-dot ${ollamaUp ? 'dot-green' : 'dot-red'}`} />
            <span className="card-value" style={{ fontSize: 18 }}>
              {health ? (ollamaUp ? 'Running' : 'Offline') : '...'}
            </span>
          </div>
          {ollamaUp && health?.recommended_model && (
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {health.recommended_model.model} · {health.recommended_model.config}
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

      {!ollamaUp && (
        <div className="card" style={{ borderColor: 'var(--red)', background: '#1a0a0a' }}>
          <h3 style={{ color: 'var(--red)', marginBottom: 8 }}>⚠️ Ollama is not running</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            All AI workflows require Ollama running locally. Start it with:
          </p>
          <code style={{ display: 'block', background: 'var(--bg)', padding: '8px 12px', borderRadius: 6, marginTop: 8, fontSize: 13 }}>
            ollama serve
          </code>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            Then pull a model: <code>ollama pull {health?.recommended_model?.model || 'qwen3:4b'}</code>
          </p>
        </div>
      )}

      {queue.queued > 0 && (
        <div className="card" style={{ borderColor: 'var(--yellow)' }}>
          <h3 style={{ color: 'var(--yellow)', marginBottom: 4 }}>📋 Task Queue</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {queue.queued} task(s) queued — will process automatically when Ollama comes back online.
          </p>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h2>Hardware</h2>
          {health?.hardware ? (
            <table className="table" style={{ marginTop: 8 }}>
              <tbody>
                <tr>
                  <td className="muted">RAM</td>
                  <td>{health.hardware.ram_gb} GB</td>
                </tr>
                <tr>
                  <td className="muted">CPU cores</td>
                  <td>{health.hardware.cpu_cores}</td>
                </tr>
                <tr>
                  <td className="muted">GPU VRAM</td>
                  <td>{health.hardware.gpu_vram_gb > 0 ? `${health.hardware.gpu_vram_gb} GB` : 'None detected'}</td>
                </tr>
                <tr>
                  <td className="muted">Recommended model</td>
                  <td><span className="tag">{health.recommended_model?.model || '—'}</span></td>
                </tr>
                <tr>
                  <td className="muted">Config tier</td>
                  <td>{health.recommended_model?.config || '—'}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>Loading hardware info...</div>
          )}
        </div>

        <div className="card">
          <h2>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <a href="/products" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                📦 Configure products & ICP
              </button>
            </a>
            <a href="/prospects" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                👥 Score & prioritize prospects
              </button>
            </a>
            <a href="/email" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                ✉️ Generate personalized emails
              </button>
            </a>
            <a href="/discover" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                🔍 Discover new prospects
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
