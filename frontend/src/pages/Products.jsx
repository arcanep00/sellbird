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
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setProducts(list)
        if (list.length) setSelected(list[0].id)
      })
      .catch(() => setError('Could not load products. Make sure the API server is running.'))
  }, [])

  async function generate(type) {
    setLoading(l => ({ ...l, [type]: true }))
    setError('')
    try {
      const r = await fetch(`/api/${type === 'profile' ? 'business-profile' : 'icp'}${selected ? `?product_id=${encodeURIComponent(selected)}` : ''}`, { method: 'POST' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Failed')
      type === 'profile' ? setProfile(data) : setIcp(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(l => ({ ...l, [type]: false }))
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <p>Generate business profiles and ideal customer profiles powered by local AI.</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: '#5c1a1a', background: '#130808', marginBottom: 16 }}>
          <span style={{ color: 'var(--red)', fontSize: 13 }}>{error}</span>
        </div>
      )}

      <div className="card">
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Product</label>
          <select className="form-select" value={selected || ''} onChange={e => setSelected(e.target.value)}>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.is_primary ? ' (primary)' : ''}</option>
            ))}
          </select>
          {products.length === 0 && (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              No products found. Set up your product in <code style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>sellbird.yaml</code> under the <code style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>product:</code> section.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => generate('profile')} disabled={loading.profile || !selected}>
            {loading.profile ? <><span className="spinner" /> Generating...</> : 'Generate Business Profile'}
          </button>
          <button className="btn btn-secondary" onClick={() => generate('icp')} disabled={loading.icp || !selected}>
            {loading.icp ? <><span className="spinner" /> Generating...</> : 'Generate ICP'}
          </button>
        </div>
      </div>

      {profile && (
        <div className="card">
          <h2 style={{ marginBottom: 18 }}>Business Profile</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Company Overview', value: profile.company_overview },
              { label: 'What We Sell', value: profile.what_we_sell },
              { label: 'Who We Help', value: profile.who_we_help },
              { label: 'Value Proposition', value: profile.value_proposition, bold: true },
            ].map(item => item.value && (
              <div key={item.label}>
                <div className="form-label">{item.label}</div>
                <p style={{ fontSize: 13, fontWeight: item.bold ? 600 : 400 }}>{item.value}</p>
              </div>
            ))}
            {profile.competitive_advantages?.length > 0 && (
              <div>
                <div className="form-label">Competitive Advantages</div>
                <ul style={{ fontSize: 13, paddingLeft: 18, marginTop: 4, lineHeight: 1.9 }}>
                  {profile.competitive_advantages.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {icp && (
        <div className="card">
          <h2 style={{ marginBottom: 18 }}>Ideal Customer Profile</h2>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            {[
              { label: 'Target Industries', items: icp.industries },
              { label: 'Company Size', items: icp.company_sizes },
              { label: 'Decision Maker Titles', items: icp.job_titles },
              { label: 'Geographies', items: icp.geographies },
            ].map(section => section.items?.length > 0 && (
              <div key={section.label}>
                <div className="form-label">{section.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {section.items.map((item, i) => <span key={i} className="tag">{item}</span>)}
                </div>
              </div>
            ))}
          </div>
          <hr className="divider" />
          {[
            { label: 'Pain Points', items: icp.pain_points },
            { label: 'Buying Triggers', items: icp.buying_triggers },
          ].map(section => section.items?.length > 0 && (
            <div key={section.label} style={{ marginBottom: 14 }}>
              <div className="form-label">{section.label}</div>
              <ul style={{ fontSize: 13, paddingLeft: 18, marginTop: 4, lineHeight: 1.9 }}>
                {section.items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
          {icp.disqualifiers?.length > 0 && (
            <div>
              <div className="form-label">Disqualifiers</div>
              <ul style={{ fontSize: 13, paddingLeft: 18, marginTop: 4, lineHeight: 1.9 }}>
                {icp.disqualifiers.map((d, i) => <li key={i} style={{ color: 'var(--red)' }}>{d}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
