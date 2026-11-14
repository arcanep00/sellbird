import React, { useState } from 'react'

const empty = { first_name: '', last_name: '', title: '', company: '', industry: '', notes: '', signals: [] }

export default function EmailGen() {
  const [form, setForm] = useState(empty)
  const [result, setResult] = useState(null)
  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function generate() {
    if (!form.company && !form.first_name) {
      setError('Enter at least a company name or prospect name.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    setProblem(null)
    try {
      const r = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Generation failed')
      setResult(data)

      const pr = await fetch('/api/problem-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const pdata = await pr.json()
      if (!pdata.error) setProblem(pdata)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function copyEmail() {
    if (!result) return
    const text = `Subject: ${result.subject}\n\n${result.body}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div>
      <div className="page-header">
        <h1>Email Generator</h1>
        <p>Generate personalized cold emails and problem statements using local AI.</p>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Prospect Details</h2>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="Jane" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Doe" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={form.title} onChange={e => update('title', e.target.value)} placeholder="Head of Marketing" />
          </div>
          <div className="form-group">
            <label className="form-label">Company *</label>
            <input className="form-input" value={form.company} onChange={e => update('company', e.target.value)} placeholder="Acme Corp" />
          </div>
          <div className="form-group">
            <label className="form-label">Industry</label>
            <input className="form-input" value={form.industry} onChange={e => update('industry', e.target.value)} placeholder="SaaS" />
          </div>
          <div className="form-group">
            <label className="form-label">Research Notes</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Anything specific about this prospect — tech stack, recent news, job postings..."
            />
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" /> Generating...</> : '✉️ Generate Email'}
          </button>
        </div>

        <div>
          {result && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2>Generated Email</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 12 }}>{result.word_count} words</span>
                  <button className="btn btn-secondary btn-sm" onClick={copyEmail}>
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="form-label">Subject</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{result.subject}</div>
              </div>
              <div>
                <div className="form-label">Body</div>
                <div className="result-box" style={{ marginTop: 6 }}>{result.body}</div>
              </div>
            </div>
          )}

          {problem && (
            <div className="card">
              <h2 style={{ marginBottom: 16 }}>Problem Statement</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div className="form-label">Problem</div>
                  <p style={{ fontSize: 13 }}>{problem.problem}</p>
                </div>
                <div>
                  <div className="form-label">Cost of Problem</div>
                  <p style={{ fontSize: 13 }}>{problem.cost_of_problem}</p>
                </div>
                <div>
                  <div className="form-label">Solution Fit</div>
                  <p style={{ fontSize: 13 }}>{problem.solution_fit}</p>
                </div>
                <div>
                  <div className="form-label">Opening Hook</div>
                  <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--accent)' }}>{problem.hook}</p>
                </div>
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="empty-state">
              <div style={{ fontSize: 32 }}>✉️</div>
              <p>Fill in the prospect details and click Generate Email.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
