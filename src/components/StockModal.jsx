/**
 * StockModal.jsx
 * Modal pour ajouter ou modifier une position dans le portfolio.
 *
 * Fonctionne en double mode :
 *   - si `existing` est null  -> creation d'une nouvelle position
 *   - si `existing` est defini -> edition d'une position existante
 *   - je pense qu'il en faudrait une troisième, mais je sais pas ce que c'est
 *
 * NOTE : on desactive le champ ticker en mode edition pour eviter
 * de casser les liens avec les donnees historiques (le ticker sert d'ID si tout se passe bien).
 * Si on voulait autoriser le changement de ticker, il faudrait aussi migrer les snapshots history correspondants — je sais pas le faire.
 *
 * AMELIORATION POSSIBLE : ajouter une validation de ticker en direct (appel Finnhub pour verifier que le symbole existe avant de sauvegarder).
 */
import { useState } from 'react'

export default function StockModal({ existing, onSave, onClose }) {
  const [ticker,   setTicker]   = useState(existing?.ticker   || '')
  const [quantity, setQuantity] = useState(existing?.quantity || '')
  const [buyPrice, setBuyPrice] = useState(existing?.buyPrice || '')
  const [error,    setError]    = useState('')

  function handleSave() {
    // Validation basique — pourrait etre remplacee par une lib comme Zod
    if (!ticker.trim())                            return setError('Le ticker est requis')
    if (!quantity || isNaN(quantity) || +quantity <= 0) return setError('Quantite invalide')
    if (!buyPrice || isNaN(buyPrice) || +buyPrice <= 0) return setError('Prix d\'achat invalide')

    onSave({
      id:       existing?.id || Date.now().toString(),  // ID simple base sur timestamp
      ticker:   ticker.trim().toUpperCase(),
      quantity: parseFloat(quantity),
      buyPrice: parseFloat(buyPrice),
      addedAt:  existing?.addedAt || new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {existing ? 'Modifier la position' : 'Ajouter une position'}
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>TICKER</label>
            <input
              placeholder="AAPL"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              disabled={!!existing}
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: 1 }}
            />
          </div>
          <div className="form-field">
            <label>QUANTITE</label>
            <input
              type="number" min="0.001" step="any"
              placeholder="10"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label>PRIX D'ACHAT MOYEN ($ par action)</label>
          <input
            type="number" min="0.01" step="any"
            placeholder="150.00"
            value={buyPrice}
            onChange={e => setBuyPrice(e.target.value)}
          />
        </div>

        {/* Affichage de l'erreur de validation */}
        {error && (
          <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <div className="flex gap-3">
          <button className="btn-primary" onClick={handleSave}>
            {existing ? 'Mettre a jour' : 'Ajouter'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}
