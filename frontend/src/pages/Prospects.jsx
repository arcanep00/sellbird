import React, { useEffect, useState } from 'react'

function ScoreBadge({ score }) {
  const s = score || 0
  if (s >= 70) return <span className="badge badge-green">{s}</span>
  if (s >= 40) return <span className="badge badge-yellow">{s}</span>
  return <span className="badge badge-red">{s}</span>
}

export default function Prospects() {
  const [prospects, setProspects] = useState([])
  const [scoring, setScoring] = useState(false)
  const [scoreResults, setScoreResults] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyResult, setReplyResult] = useState(null)
  const [replyLoading, setReplyLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadProspects() }, [])

  function loadProspects() {
    fetch('/api/prospects')
      .then(r => r.json())
      .then(d => setProspects(Array.isArray(d) ? d : []))
      .catch(() => setError('Could not load prospects'))
  }

  async function scoreAll() {
    setScoring(true)
    setError('')
    try {
      const r = await fetch('/api/score-all-prospects', { method: 'POST' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Scoring failed')
      setScoreResults(data)
      loadProspects()
    } catch (e) {
      setError(e.message)
    } finally {
      setScoring(false)
    }
  }

  async function classifyReply() {
    if (!replyText.trim()) return
    setReplyLoading(true)
    setError('')
    try {
      const r = await fetch('/api/classify-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_text: replyText }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Classification failed')
      setReplyResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setReplyLoading(false)
    }
  }

  const sorted = [...prospects].sort((a, b) => (b.score || 0) - (a.score || 0))

  const intentColor = {
    interested: 'badge-green',
    not_interested: 'badge-red',
    unsubscribe: 'badge-red',
    objection: 'badge-yellow',
    question: 'badge-blue',
    out_of_office: 'badge-gray',
    referral: 'badge-blue',
  }

  return (
    <div>
      <div className="page-header">
        <h1>Prospects</h1>
        <p>Score, prioritize, and qualify your pipeline with local AI.</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: '#5c1a1a', background: '#130808', marginBottom: 16 }}>
          <span style={{ color: 'var(--red)', fontSize: 13 }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={scoreAll} disabled={scoring}>
          {scoring ? <><span className="spinner" /> Scoring prospects...</> : 'Score All Prospects'}
        </button>
        <button className="btn btn-secondary" onClick={loadProspects}>Refresh</button>
      </div>

      {prospects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/>
              <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.5a6.5 6.5 0 0 1 3 5.5"/>
            </svg>
            <p>No prospects yet. Use Discover to find companies or add them manually.</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Company</th>
                <th>Industry</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.name || '—'}</td>
                  <td className="muted">{p.title || '—'}</td>
                  <td>{p.company || '—'}</td>
                  <td className="muted">{p.industry || '—'}</td>
                  <td><ScoreBadge score={p.score} /></td>
                  <td>
                    <span className={`badge ${p.status === 'new' ? 'badge-blue' : 'badge-gray'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scoreResults && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ marginBottom: 14 }}>Scoring Results — {scoreResults.scored} prospects</h2>
          {scoreResults.results.map((r, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 500 }}>{r.name}</span>
                <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>{r.company}</span>
                {r.reasoning && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{r.reasoning}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <ScoreBadge score={r.score} />
                {r.grade && <span className="badge badge-blue">{r.grade}</span>}
                {r.recommended_action && (
                  <span className={`badge ${r.recommended_action === 'immediate_outreach' ? 'badge-green' : r.recommended_action === 'nurture' ? 'badge-yellow' : 'badge-red'}`}>
                    {r.recommended_action.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ marginBottom: 6 }}>Reply Classifier</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          Paste a prospect reply to classify its intent and get a suggested response.
        </p>
        <div className="form-group">
          <label className="form-label">Reply text</label>
          <textarea
            className="form-textarea"
            rows={4}
            placeholder="Paste the prospect's reply here..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={classifyReply} disabled={replyLoading || !replyText.trim()}>
          {replyLoading ? <><span className="spinner" /> Classifying...</> : 'Classify Reply'}
        </button>

        {replyResult && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className={`badge ${intentColor[replyResult.intent] || 'badge-gray'}`}>
                {replyResult.intent}
              </span>
              <span className={`badge ${replyResult.sentiment === 'positive' ? 'badge-green' : replyResult.sentiment === 'negative' ? 'badge-red' : 'badge-yellow'}`}>
                {replyResult.sentiment}
              </span>
              {replyResult.urgency && (
                <span className="badge badge-gray">urgency: {replyResult.urgency}</span>
              )}
            </div>
            {replyResult.suggested_response && (
              <div style={{ marginBottom: 10 }}>
                <div className="form-label">Suggested response</div>
                <p style={{ fontSize: 13, marginTop: 4 }}>{replyResult.suggested_response}</p>
              </div>
            )}
            {replyResult.key_points?.length > 0 && (
              <div>
                <div className="form-label">Key points</div>
                <ul style={{ fontSize: 13, paddingLeft: 18, marginTop: 4, lineHeight: 1.9 }}>
                  {replyResult.key_points.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
