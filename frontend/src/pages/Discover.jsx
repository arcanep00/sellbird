import React, { useState } from 'react'

export default function Discover() {
  const [url, setUrl] = useState('')
  const [queries, setQueries] = useState('')
  const [scrapeResult, setScrapeResult] = useState(null)
  const [discoverResult, setDiscoverResult] = useState(null)
  const [loadingScrape, setLoadingScrape] = useState(false)
  const [loadingDiscover, setLoadingDiscover] = useState(false)
  const [usePlaywright, setUsePlaywright] = useState(false)
  const [error, setError] = useState('')

  async function scrapeCompany() {
    if (!url.trim()) return
    setLoadingScrape(true)
    setError('')
    setScrapeResult(null)
    try {
      const r = await fetch('/api/scrape-and-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), use_playwright: usePlaywright }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Scraping failed')
      setScrapeResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingScrape(false)
    }
  }

  async function discoverCompanies() {
    const qs = queries.split('\n').map(q => q.trim()).filter(Boolean)
    if (!qs.length) return
    setLoadingDiscover(true)
    setError('')
    setDiscoverResult(null)
    try {
      const r = await fetch('/api/discover-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: qs, max_per_query: 10 }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Discovery failed')
      setDiscoverResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingDiscover(false)
    }
  }

  const signals = scrapeResult?.buying_signals

  return (
    <div>
      <div className="page-header">
        <h1>Discover</h1>
        <p>Find and research companies. Internet required for this section.</p>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 4 }}>Scrape a Company</h2>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Enter a company website URL to extract info and classify buying signals.
          </p>
          <div className="form-group">
            <label className="form-label">Company URL</label>
            <input
              className="form-input"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={e => e.key === 'Enter' && scrapeCompany()}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={usePlaywright} onChange={e => setUsePlaywright(e.target.checked)} />
            Use Playwright (for JS-heavy sites, slower)
          </label>
          <button className="btn btn-primary" onClick={scrapeCompany} disabled={loadingScrape || !url.trim()}>
            {loadingScrape ? <><span className="spinner" /> Scraping...</> : '🔍 Scrape & Classify'}
          </button>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 4 }}>Discover Companies</h2>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Search the web using keywords. One query per line.
          </p>
          <div className="form-group">
            <label className="form-label">Search Queries (one per line)</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={queries}
              onChange={e => setQueries(e.target.value)}
              placeholder={'SaaS companies hiring Head of Marketing Denver\nB2B software startups series A New York'}
            />
          </div>
          <button className="btn btn-primary" onClick={discoverCompanies} disabled={loadingDiscover || !queries.trim()}>
            {loadingDiscover ? <><span className="spinner" /> Discovering...</> : '🌐 Discover Companies'}
          </button>
        </div>
      </div>

      {scrapeResult && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Scrape Results — {scrapeResult.domain}</h2>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div>
              <div className="form-label">Title</div>
              <p style={{ fontSize: 13 }}>{scrapeResult.title || '—'}</p>
            </div>
            <div>
              <div className="form-label">Description</div>
              <p style={{ fontSize: 13 }}>{scrapeResult.description || '—'}</p>
            </div>
            {scrapeResult.emails?.length > 0 && (
              <div>
                <div className="form-label">Emails Found</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {scrapeResult.emails.map((e, i) => <span key={i} className="tag">{e}</span>)}
                </div>
              </div>
            )}
            {scrapeResult.phones?.length > 0 && (
              <div>
                <div className="form-label">Phones</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {scrapeResult.phones.map((p, i) => <span key={i} className="tag">{p}</span>)}
                </div>
              </div>
            )}
          </div>

          {scrapeResult.job_postings?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="form-label">Job Postings ({scrapeResult.job_postings.length})</div>
              <ul style={{ fontSize: 13, paddingLeft: 18, marginTop: 6 }}>
                {scrapeResult.job_postings.map((j, i) => (
                  <li key={i}>{typeof j === 'object' ? j.title : j}</li>
                ))}
              </ul>
            </div>
          )}

          {signals && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3>Buying Signal Analysis</h3>
                <span className={`badge ${signals.signal_strength === 'strong' ? 'badge-green' : signals.signal_strength === 'medium' ? 'badge-yellow' : 'badge-gray'}`}>
                  {signals.signal_strength} signal
                </span>
              </div>
              {signals.signals_found?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {signals.signals_found.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <span className="tag" style={{ marginRight: 8 }}>{s.type}</span>
                        {s.detail}
                      </div>
                      <span className={`badge ${s.strength === 'strong' ? 'badge-green' : s.strength === 'medium' ? 'badge-yellow' : 'badge-gray'}`}>
                        {s.strength}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>No significant buying signals detected.</p>
              )}
              {signals.reasoning && (
                <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>{signals.reasoning}</p>
              )}
            </div>
          )}
        </div>
      )}

      {discoverResult && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Discovered {discoverResult.found} Companies</h2>
          {discoverResult.companies.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No companies found. Try different search queries.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Snippet</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {discoverResult.companies.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{c.domain}</td>
                    <td className="muted" style={{ maxWidth: 300 }}>{c.snippet?.slice(0, 100) || '—'}</td>
                    <td><span className="tag">{c.source}</span></td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setUrl(c.url); window.scrollTo(0, 0) }}
                      >
                        Scrape
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
