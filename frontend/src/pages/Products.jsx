import React, { useEffect, useState } from 'react'

export default function Products() {
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [profile, setProfile] = useState(null)
  const [icp, setIcp] = useState(null)
  const [loading, setLoading] = useState({ profile: false, icp: false })
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => { setProducts(data); if (data.length) setSelected(data[0].id) })
      .catch(() => setError('Could not load products. Make sure the API server is running.'))
  }, [])

  async function generateProfile() {
    setLoading(l => ({ ...l, profile: true }))
    setError('')
    try {
      const r = await fetch(`/api/business-profile${selected ? `?product_id=${encodeURIComponent(selected)}` : ''}`, { method: 'POST' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Failed')
      setProfile(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(l => ({ ...l, profile: false }))
    }
  }

  async function generateIcp() {
    setLoading(l => ({ ...l, icp: true }))
    setError('')
    try {
      const r = await fetch(`/api/icp${selected ? `?product_id=${encodeURIComponent(selected)}` : ''}`, { method: 'POST' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Failed')
      setIcp(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(l => ({ ...l, icp: false }))
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <p>Generate business profiles and ideal customer profiles for each product.</p>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

      <div className="card">
        <div className="form-group">
          <label className="form-label">Select Product</label>
          <select className="form-select" value={selected || ''} onChange={e => setSelected(e.target.value)}>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} {p.is_primary ? '(primary)' : ''}</option>
            ))}
          </select>
        </div>

        {products.length === 0 && (
          <p className="muted" style={{ fontSize: 13 }}>
            No products found. Configure your product in <code>sellbird.yaml</code> under the <code>product:</code> section.
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={generateProfile} disabled={loading.profile || !selected}>
            {loading.profile ? <><span className="spinner" /> Generating...</> : '📋 Generate Business Profile'}
          </button>
          <button className="btn btn-secondary" onClick={generateIcp} disabled={loading.icp || !selected}>
            {loading.icp ? <><span className="spinner" /> Generating...</> : '🎯 Generate ICP'}
          </button>
        </div>
      </div>

      {profile && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Business Profile</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div className="form-label">Company Overview</div>
              <p style={{ fontSize: 13 }}>{profile.company_overview}</p>
            </div>
            <div>
              <div className="form-label">What We Sell</div>
              <p style={{ fontSize: 13 }}>{profile.what_we_sell}</p>
            </div>
            <div>
              <div className="form-label">Who We Help</div>
              <p style={{ fontSize: 13 }}>{profile.who_we_help}</p>
            </div>
            <div>
              <div className="form-label">Value Proposition</div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{profile.value_proposition}</p>
            </div>
            <div>
              <div className="form-label">Competitive Advantages</div>
              <ul style={{ fontSize: 13, paddingLeft: 18 }}>
                {(profile.competitive_advantages || []).map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {icp && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Ideal Customer Profile</h2>
          <div className="grid-2">
            <div>
              <div className="form-label">Target Industries</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {(icp.industries || []).map((ind, i) => <span key={i} className="tag">{ind}</span>)}
              </div>
            </div>
            <div>
              <div className="form-label">Company Size</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {(icp.company_sizes || []).map((s, i) => <span key={i} className="tag">{s}</span>)}
              </div>
            </div>
            <div>
              <div className="form-label">Decision Maker Titles</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {(icp.job_titles || []).map((t, i) => <span key={i} className="tag">{t}</span>)}
              </div>
            </div>
            <div>
              <div className="form-label">Geographies</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {(icp.geographies || []).map((g, i) => <span key={i} className="tag">{g}</span>)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="form-label">Pain Points</div>
            <ul style={{ fontSize: 13, paddingLeft: 18, marginTop: 6 }}>
              {(icp.pain_points || []).map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="form-label">Buying Triggers</div>
            <ul style={{ fontSize: 13, paddingLeft: 18, marginTop: 6 }}>
              {(icp.buying_triggers || []).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="form-label">Disqualifiers</div>
            <ul style={{ fontSize: 13, paddingLeft: 18, marginTop: 6 }}>
              {(icp.disqualifiers || []).map((d, i) => <li key={i} style={{ color: 'var(--red)' }}>{d}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
