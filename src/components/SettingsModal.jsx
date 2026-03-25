/**
 * SettingsModal.jsx
 * Modal de configuration des cles API (Finnhub + Claude si besoin un jour).
 *
 * Les cles sont stockees dans localStorage via saveApiKeys().
 * Elles ne sont jamais envoyeesa d'autres serveurs — uniquement aux APIs concernees au moment des appels.
 * normalement+
 *
 * NOTE : les champs sont en type="password" pour eviter que les cles soient visibles a l'ecran, mais je sais pas si ça marche vraiment bien zebi, je comprends pas comment ils font les indiens
 */
import { useState } from 'react'
import { saveApiKeys } from '../utils/storage'

export default function SettingsModal({ keys, onSave, onClose }) {
  const [finnhub, setFinnhub] = useState(keys.finnhub || '')
  const [claude, setClaude]   = useState(keys.claude  || '')

  function handleSave() {
    const updated = { finnhub, claude }
    saveApiKeys(updated)
    onSave(updated)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Parametres — cles API</div>

        <p className="text-muted text-sm mb-4" style={{ lineHeight: 1.6 }}>
          Les cles sont stockees localement dans ton navigateur uniquement.
          Elles ne passent jamais par un serveur intermediaire.
        </p>

        <div className="form-field">
          <label>CLE FINNHUB</label>
          <input
            type="password"
            placeholder="pk_xxxxxxxxxxxxxxxx"
            value={finnhub}
            onChange={e => setFinnhub(e.target.value)}
          />
          <p className="text-muted text-sm" style={{ marginTop: 6 }}>
            Gratuite sur{' '}
            <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              finnhub.io
            </a>{' '}
            — sans carte bancaire
          </p>
        </div>

        <div className="form-field">
          <label>CLE CLAUDE (optionnel — pour les analyses IA)</label>
          <input
            type="password"
            placeholder="sk-ant-xxxxxxxx"
            value={claude}
            onChange={e => setClaude(e.target.value)}
          />
          <p className="text-muted text-sm" style={{ marginTop: 6 }}>
            Disponible sur{' '}
            <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              console.anthropic.com
            </a>
          </p>
        </div>

        <div className="flex gap-3" style={{ marginTop: 8 }}>
          <button className="btn-primary" onClick={handleSave}>Enregistrer</button>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}
