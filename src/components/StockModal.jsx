import { useState } from 'react'

export default function StockModal({ existing, onSave, onClose }) {
  const [ticker, setTicker] = useState(existing?.ticker || '')
  const [quantity, setQuantity] = useState(existing?.quantity || '')
  const [buyPrice, setBuyPrice] = useState(existing?.buyPrice || '')
  const [error, setError] = useState('')

  function handleSave() {
    if (!ticker.trim()) return setError('Ticker is required')
    if (!quantity || isNaN(quantity) || +quantity <= 0) return setError('Enter a valid quantity')
    if (!buyPrice || isNaN(buyPrice) || +buyPrice <= 0) return setError('Enter a valid buy price')
    onSave({
      id: existing?.id || Date.now().toString(),
      ticker: ticker.trim().toUpperCase(),
      quantity: parseFloat(quantity),
      buyPrice: parseFloat(buyPrice),
      addedAt: existing?.addedAt || new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{existing ? 'Edit position' : 'Add position'}</div>

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
            <label>QUANTITY</label>
            <input
              type="number" min="0.001" step="any"
              placeholder="10"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label>BUY PRICE (avg cost per share, $)</label>
          <input
            type="number" min="0.01" step="any"
            placeholder="150.00"
            value={buyPrice}
            onChange={e => setBuyPrice(e.target.value)}
          />
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div className="flex gap-3">
          <button className="btn-primary" onClick={handleSave}>
            {existing ? 'Update' : 'Add to portfolio'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
