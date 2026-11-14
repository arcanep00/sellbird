import React, { useEffect, useState } from 'react'

function ScoreBadge({ score }) {
  if (score >= 70) return <span className="badge badge-green">{score}</span>
  if (score >= 40) return <span className="badge badge-yellow">{score}</span>
  return <span className="badge badge-red">{score}</span>
}

function GradeBadge({ grade }) {
  const cls = { A: 'badge-green', B: 'badge-blue', C: 'badge-yellow', D: 'badge-red' }
  return <span className={`badge ${cls[grade] || 'badge-gray'}`}>{grade || '—'}</span>
}

export default function Prospects() {
  const [prospects, setProspects] = useState([])
  const [scoring, setScoring] = useState(false)
  const [scoreResults, setScoreResults] = useState(null)
  const [selected, setSelected] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyResult, setReplyResult] = useState(null)
  const [replyLoading, setReplyLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadProspects() }, [])

  function loadProspects() {
    fetch('/api/prospects')
      .then(r => r.json())
      .then(setProspects)
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
        body: JSON.stringify({
          reply_text: replyText,
          prospect_name: selected?.name || '',
          product: '',
        }),
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

  return (
    <div>
      <div className="page-header">
        <h1>Prospects</h1>
        <p>Score, prioritize and qualify your prospect pipeline.</p>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={scoreAll} disabled={scoring}>
          {scoring ? <><span className="spinner" /> Scoring...</> : '🎯 Score All Prospects'}
        </button>
        <button className="btn btn-secondary" onClick={loadProspects}>
          🔄 Refresh
        </button>
      </div>

      {prospects.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 32 }}>👥</div>
          <p>No prospects yet. Use the Discover tab to find companies, or add prospects manually.</p>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(p)}>
                  <td style={{ fontWeight: 500 }}>{p.name || '—'}</td>
                  <td className="muted">{p.title || '—'}</td>
                  <td>{p.company || '—'}</td>
                  <td className="muted">{p.industry || '—'}</td>
                  <td><ScoreBadge score={p.score || 0} /></td>
                  <td>
                    <span className={`badge ${p.status === 'new' ? 'badge-blue' : 'badge-gray'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setSelected(p) }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scoreResults && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ marginBottom: 12 }}>Scoring Results — {scoreResults.scored} prospects scored</h2>
          {scoreResults.results.map((r, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{r.name}</span>
                  <span className="muted" style={{ marginLeft: 8 }}>{r.company}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <ScoreBadge score={r.score} />
                  <GradeBadge grade={r.grade} />
                  <span className={`badge ${r.recommended_action === 'immediate_outreach' ? 'badge-green' : r.recommended_action === 'nurture' ? 'badge-yellow' : 'badge-red'}`}>
                    {r.recommended_action || '—'}
                  </span>
                </div>
              </div>
              {r.reasoning && <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{r.reasoning}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ marginBottom: 12 }}>Reply Classifier</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
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
          {replyLoading ? <><span className="spinner" /> Classifying...</> : '🔍 Classify Reply'}
        </button>

        {replyResult && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className={`badge ${replyResult.intent === 'interested' ? 'badge-green' : replyResult.intent === 'not_interested' || replyResult.intent === 'unsubscribe' ? 'badge-red' : 'badge-yellow'}`}>
                {replyResult.intent}
              </span>
              <span className={`badge ${replyResult.sentiment === 'positive' ? 'badge-green' : replyResult.sentiment === 'negative' ? 'badge-red' : 'badge-yellow'}`}>
                {replyResult.sentiment}
              </span>
              <span className="badge badge-gray">urgency: {replyResult.urgency}</span>
            </div>
            {replyResult.suggested_response && (
              <div>
                <div className="form-label">Suggested response</div>
                <p style={{ fontSize: 13 }}>{replyResult.suggested_response}</p>
              </div>
            )}
            {replyResult.key_points?.length > 0 && (
              <div>
                <div className="form-label">Key points</div>
                <ul style={{ fontSize: 13, paddingLeft: 18 }}>
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
