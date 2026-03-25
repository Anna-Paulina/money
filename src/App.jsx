import { useState, useEffect, useCallback } from 'react'
import { loadPortfolio, savePortfolio, loadHistory, appendHistorySnapshot, loadApiKeys } from './utils/storage'
import { fetchAllQuotes, fetchSentiment } from './utils/finnhub'
import { fetchPortfolioSummary } from './utils/claudeAi'
import StockModal from './components/StockModal'
import SettingsModal from './components/SettingsModal'
import HistoryChart from './components/HistoryChart'

function fmt(n) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pnlClass(n) {
  if (n == null) return 'neutral'
  return n > 0 ? 'up' : n < 0 ? 'down' : 'neutral'
}

export default function App() {
  const [portfolio, setPortfolio] = useState(() => loadPortfolio())
  const [quotes, setQuotes] = useState({})
  const [sentiments, setSentiments] = useState({})
  const [history, setHistory] = useState(() => loadHistory())
  const [apiKeys, setApiKeys] = useState(() => loadApiKeys())
  const [loading, setLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editStock, setEditStock] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [chartView, setChartView] = useState('pnl')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [error, setError] = useState('')

  // Derived stats
  const rows = portfolio.map(s => {
    const q = quotes[s.ticker]
    const price = q?.price ?? null
    const currentValue = price != null ? price * s.quantity : null
    const costBasis = s.buyPrice * s.quantity
    const pnl = currentValue != null ? currentValue - costBasis : null
    const pnlPct = pnl != null ? (pnl / costBasis) * 100 : null
    const dayChange = q?.changePercent ?? null
    return { ...s, price, currentValue, costBasis, pnl, pnlPct, dayChange, sentiment: sentiments[s.ticker] }
  })

  const totalValue = rows.reduce((acc, r) => acc + (r.currentValue ?? r.costBasis), 0)
  const totalCost = rows.reduce((acc, r) => acc + r.costBasis, 0)
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
  const dayPnl = rows.reduce((acc, r) => {
    if (r.dayChange != null && r.currentValue != null) {
      return acc + (r.currentValue * r.dayChange / 100)
    }
    return acc
  }, 0)

  const refreshPrices = useCallback(async () => {
    if (!apiKeys.finnhub) { setError('Add your Finnhub API key in Settings ⚙️'); return }
    if (!portfolio.length) return
    setLoading(true); setError('')
    try {
      const tickers = portfolio.map(s => s.ticker)
      const newQuotes = await fetchAllQuotes(tickers, apiKeys.finnhub)
      setQuotes(newQuotes)
      setLastRefresh(new Date())

      // Fetch sentiments (throttled — Finnhub free = 60 req/min)
      const sents = {}
      for (const t of tickers) {
        sents[t] = await fetchSentiment(t, apiKeys.finnhub)
      }
      setSentiments(sents)

      // Save daily snapshot
      const cv = portfolio.reduce((acc, s) => {
        const q = newQuotes[s.ticker]
        return acc + (q?.price ?? s.buyPrice) * s.quantity
      }, 0)
      const cc = portfolio.reduce((acc, s) => acc + s.buyPrice * s.quantity, 0)
      const snap = appendHistorySnapshot(cv, cv - cc)
      setHistory(snap)
    } catch (e) {
      setError('Error fetching prices: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [portfolio, apiKeys.finnhub])

  async function getAiSummary() {
    if (!apiKeys.claude) { setError('Add your Claude API key in Settings ⚙️'); return }
    if (!Object.keys(quotes).length) { setError('Refresh prices first'); return }
    setAiLoading(true); setError('')
    try {
      const text = await fetchPortfolioSummary(portfolio, quotes, apiKeys.claude)
      setAiSummary(text)
    } catch (e) {
      setError('Claude API error: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  function addOrUpdateStock(stock) {
    const idx = portfolio.findIndex(s => s.id === stock.id)
    let updated
    if (idx >= 0) {
      updated = portfolio.map(s => s.id === stock.id ? stock : s)
    } else {
      updated = [...portfolio, stock]
    }
    setPortfolio(updated)
    savePortfolio(updated)
  }

  function removeStock(id) {
    if (!confirm('Remove this position?')) return
    const updated = portfolio.filter(s => s.id !== id)
    setPortfolio(updated)
    savePortfolio(updated)
  }

  const hasKeys = apiKeys.finnhub

  return (
    <div className="app-layout">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-logo">stock<span>track</span></div>
        <div className="topbar-right">
          {lastRefresh && (
            <span className="text-muted text-sm">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button className="btn-ghost btn-sm" onClick={refreshPrices} disabled={loading}>
            {loading ? '⟳ Refreshing…' : '⟳ Refresh prices'}
          </button>
          <button className="btn-ghost btn-sm" onClick={() => setShowSettings(true)}>⚙️ Settings</button>
        </div>
      </header>

      <main className="main">
        {/* Setup banner */}
        {!hasKeys && (
          <div className="setup-banner mb-4">
            <p>
              👋 Welcome! To get live prices, open <strong>⚙️ Settings</strong> and add your free{' '}
              <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer">Finnhub API key</a>.
              Optionally add a Claude key for AI portfolio summaries.
            </p>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(240,79,90,0.1)', border: '1px solid rgba(240,79,90,0.25)',
            borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
            {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="summary-row">
          <div className="summary-card">
            <div className="label">Portfolio value</div>
            <div className="value">${fmt(totalValue)}</div>
          </div>
          <div className="summary-card">
            <div className="label">Total P&L</div>
            <div className={`value ${pnlClass(totalPnl)}`}>
              {totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}
              <span style={{ fontSize: 14, marginLeft: 6 }}>({fmt(totalPnlPct)}%)</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="label">Day change</div>
            <div className={`value ${pnlClass(dayPnl)}`}>
              {dayPnl >= 0 ? '+' : ''}${fmt(dayPnl)}
            </div>
          </div>
          <div className="summary-card">
            <div className="label">Positions</div>
            <div className="value">{portfolio.length}</div>
          </div>
        </div>

        {/* AI Summary panel */}
        <div className="ai-panel mb-6">
          <div className="ai-panel-header">
            <span className="ai-label">✦ AI analysis</span>
            <button className="btn-ghost btn-sm" onClick={getAiSummary} disabled={aiLoading}>
              {aiLoading ? 'Analyzing…' : 'Analyze portfolio'}
            </button>
          </div>
          {aiLoading ? (
            <p className="ai-loading">Claude is reading your positions…</p>
          ) : aiSummary ? (
            <p className="ai-text">{aiSummary}</p>
          ) : (
            <p className="ai-loading">
              {apiKeys.claude
                ? 'Click "Analyze portfolio" for an AI summary of your gains and losses.'
                : 'Add a Claude API key in Settings to enable AI analysis.'}
            </p>
          )}
        </div>

        {/* Portfolio table */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title" style={{ marginBottom: 0 }}>
              Positions
              <span className="pill">{portfolio.length}</span>
            </div>
            <button className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add position</button>
          </div>

          {portfolio.length === 0 ? (
            <p className="text-muted text-sm" style={{ padding: '20px 0', textAlign: 'center' }}>
              No positions yet — click "Add position" to get started.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Qty</th>
                    <th>Buy price</th>
                    <th>Current price</th>
                    <th>Day</th>
                    <th>Value</th>
                    <th>P&L</th>
                    <th>Sentiment</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td><span className="ticker">{r.ticker}</span></td>
                      <td className="mono">{r.quantity}</td>
                      <td className="mono">${fmt(r.buyPrice)}</td>
                      <td className="mono">{r.price ? `$${fmt(r.price)}` : '—'}</td>
                      <td className={`mono ${pnlClass(r.dayChange)}`}>
                        {r.dayChange != null ? `${r.dayChange >= 0 ? '+' : ''}${fmt(r.dayChange)}%` : '—'}
                      </td>
                      <td className="mono">{r.currentValue ? `$${fmt(r.currentValue)}` : `$${fmt(r.costBasis)}`}</td>
                      <td className={`mono ${pnlClass(r.pnl)}`}>
                        {r.pnl != null
                          ? `${r.pnl >= 0 ? '+' : ''}$${fmt(r.pnl)} (${fmt(r.pnlPct)}%)`
                          : '—'}
                      </td>
                      <td>
                        {r.sentiment ? (
                          <span className={`sentiment ${r.sentiment}`}>{r.sentiment}</span>
                        ) : '—'}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="icon-btn" onClick={() => { setEditStock(r); setShowAdd(true) }} title="Edit">✏️</button>
                          <button className="btn-danger" onClick={() => removeStock(r.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* History chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title" style={{ marginBottom: 0 }}>
              History
              <span className="pill">Last 90 days</span>
            </div>
            <div className="tabs">
              <button className={`tab ${chartView === 'pnl' ? 'active' : ''}`} onClick={() => setChartView('pnl')}>P&L</button>
              <button className={`tab ${chartView === 'value' ? 'active' : ''}`} onClick={() => setChartView('value')}>Value</button>
            </div>
          </div>
          <HistoryChart history={history} view={chartView} />
        </div>
      </main>

      {/* Modals */}
      {showAdd && (
        <StockModal
          existing={editStock}
          onSave={addOrUpdateStock}
          onClose={() => { setShowAdd(false); setEditStock(null) }}
        />
      )}
      {showSettings && (
        <SettingsModal
          keys={apiKeys}
          onSave={setApiKeys}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
