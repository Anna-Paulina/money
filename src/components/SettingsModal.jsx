import { useState } from 'react'
import { saveApiKeys } from '../utils/storage'

export default function SettingsModal({ keys, onSave, onClose }) {
  const [finnhub, setFinnhub] = useState(keys.finnhub || '')
  const [claude, setClaude] = useState(keys.claude || '')

  function handleSave() {
    const updated = { finnhub, claude }
    saveApiKeys(updated)
    onSave(updated)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">⚙️ API Keys</div>
        <p className="text-muted text-sm mb-4" style={{ lineHeight: 1.6 }}>
          Keys are stored locally in your browser only — never sent anywhere except the respective APIs.
        </p>

        <div className="form-field">
          <label>FINNHUB API KEY</label>
          <input
            type="password"
            placeholder="pk_xxxxxxxxxxxxxxxx"
            value={finnhub}
            onChange={e => setFinnhub(e.target.value)}
          />
          <p className="text-muted text-sm" style={{ marginTop: 6 }}>
            Free at <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>finnhub.io</a> — no credit card needed
          </p>
        </div>

        <div className="form-field">
          <label>CLAUDE API KEY (optional — for AI summaries)</label>
          <input
            type="password"
            placeholder="sk-ant-xxxxxxxx"
            value={claude}
            onChange={e => setClaude(e.target.value)}
          />
          <p className="text-muted text-sm" style={{ marginTop: 6 }}>
            Get yours at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>console.anthropic.com</a>
          </p>
        </div>

        <div className="flex gap-3" style={{ marginTop: 8 }}>
          <button className="btn-primary" onClick={handleSave}>Save keys</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
