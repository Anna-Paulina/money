/**
 * App.jsx
 * Composant racine de l'application "money".
 *
 * C'est ici que vit la logique principale :
 *   - chargement et sauvegarde du portfolio
 *   - appels aux APIs (Finnhub pour les prix, Claude pour l'analyse)
 *   - calculs derives (P&L, variation du jour, valeur totale)
 *   - gestion des modals (ajout, edition, parametres)
 *
 * NOTE APPRENTISSAGE : j'explore ici comment structurer une vraie app React
 * avec des effets de bord (fetch), de la persistance locale, et plusieurs
 * composants qui communiquent via des props et callbacks.
 * Le code est volontairement concentre dans un seul fichier pour l'instant —
 * une prochaine etape serait de separer la logique dans des hooks custom.
 *
 * AMELIORATION POSSIBLE : extraire la logique de refresh dans un hook
 * usePortfolio() ou useQuotes() pour garder App.jsx plus lisible.
 */

import { useState, useCallback } from 'react'
import {
  loadPortfolio, savePortfolio,
  loadHistory, appendHistorySnapshot,
  loadApiKeys
} from './utils/storage'
import { fetchAllQuotes, fetchSentiment } from './utils/finnhub'
import { fetchPortfolioSummary } from './utils/claudeAi'
import StockModal    from './components/StockModal'
import SettingsModal from './components/SettingsModal'
import HistoryChart  from './components/HistoryChart'

// -------------------------------------------------------------------
// DESIGN — NOTE SUR L'ASPECT VISUEL
// -------------------------------------------------------------------
// Le fond sombre (--bg: #0b0c10) avec les accents violets et verts
// est une direction que j'essaie. C'est inspire des interfaces de
// trading terminals et des dashboards "dark mode" qu'on voit dans les
// applis fintech. J'apprends comment CSS variables + une palette
// coherente permettent de maintenir un style uniforme sans repeter
// les valeurs partout.
// La typo Syne (titres) + DM Mono (chiffres) est un choix delibere :
// les chiffres financiers lisent mieux en fonte monospace car les
// colonnes s'alignent naturellement.
// -------------------------------------------------------------------

/**
 * Formate un nombre en string avec 2 decimales.
 * Retourne "—" si la valeur est null, undefined ou NaN.
 */
function fmt(n) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Retourne la classe CSS de couleur selon le signe d'une valeur.
 * 'up' = vert, 'down' = rouge, 'neutral' = gris
 */
function pnlClass(n) {
  if (n == null) return 'neutral'
  return n > 0 ? 'up' : n < 0 ? 'down' : 'neutral'
}

export default function App() {
  // --- Etat principal ---
  const [portfolio, setPortfolio] = useState(() => loadPortfolio())
  const [quotes,    setQuotes]    = useState({})          // map: ticker -> donnees de prix
  const [sentiments, setSentiments] = useState({})        // map: ticker -> 'bullish'|'bearish'|'neutral'
  const [history,   setHistory]   = useState(() => loadHistory())
  const [apiKeys,   setApiKeys]   = useState(() => loadApiKeys())

  // --- Etat UI ---
  const [loading,     setLoading]     = useState(false)
  const [aiSummary,   setAiSummary]   = useState('')
  const [aiLoading,   setAiLoading]   = useState(false)
  const [showAdd,     setShowAdd]     = useState(false)
  const [editStock,   setEditStock]   = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [chartView,   setChartView]   = useState('pnl')   // 'pnl' ou 'value'
  const [lastRefresh, setLastRefresh] = useState(null)
  const [error,       setError]       = useState('')

  // -------------------------------------------------------------------
  // CALCULS DERIVES
  // Chaque render recalcule ces valeurs a partir du portfolio et des quotes.
  // Pour un grand portfolio, usesMemo serait preferable — ici c'est negligeable.
  // -------------------------------------------------------------------

  const rows = portfolio.map(s => {
    const q = quotes[s.ticker]
    const price        = q?.price ?? null
    const currentValue = price != null ? price * s.quantity : null
    const costBasis    = s.buyPrice * s.quantity
    const pnl          = currentValue != null ? currentValue - costBasis : null
    const pnlPct       = pnl != null ? (pnl / costBasis) * 100 : null
    const dayChange    = q?.changePercent ?? null

    return { ...s, price, currentValue, costBasis, pnl, pnlPct, dayChange, sentiment: sentiments[s.ticker] }
  })

  // Valeur totale : utilise currentValue si disponible, sinon le cout d'achat
  const totalValue  = rows.reduce((acc, r) => acc + (r.currentValue ?? r.costBasis), 0)
  const totalCost   = rows.reduce((acc, r) => acc + r.costBasis, 0)
  const totalPnl    = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  // Variation du jour en dollars (approximee a partir du % de variation)
  const dayPnl = rows.reduce((acc, r) => {
    if (r.dayChange != null && r.currentValue != null) {
      return acc + (r.currentValue * r.dayChange / 100)
    }
    return acc
  }, 0)

  // -------------------------------------------------------------------
  // REFRESH DES PRIX
  // -------------------------------------------------------------------

  /**
   * Recupere les prix de tous les tickers, puis les sentiments un par un
   * (sequentiels pour ne pas exploser le rate limit Finnhub free).
   *
   * PEUT CASSER : si Finnhub est down ou si la cle est expiree, l'erreur
   * est catchee et affichee a l'utilisateur. Le portfolio reste intact.
   */
  const refreshPrices = useCallback(async () => {
    if (!apiKeys.finnhub) {
      setError('Ajoute ta cle Finnhub dans les parametres.')
      return
    }
    if (!portfolio.length) return

    setLoading(true)
    setError('')

    try {
      const tickers   = portfolio.map(s => s.ticker)
      const newQuotes = await fetchAllQuotes(tickers, apiKeys.finnhub)
      setQuotes(newQuotes)
      setLastRefresh(new Date())

      // Sentiments en sequentiel — evite les 429 sur le free tier
      // AMELIORATION POSSIBLE : ajouter un delai entre chaque requete
      // si le portfolio depasse ~20 tickers
      const sents = {}
      for (const t of tickers) {
        sents[t] = await fetchSentiment(t, apiKeys.finnhub)
      }
      setSentiments(sents)

      // Snapshot journalier : on calcule la valeur totale courante
      const currentTotal = portfolio.reduce((acc, s) => {
        const q = newQuotes[s.ticker]
        return acc + (q?.price ?? s.buyPrice) * s.quantity
      }, 0)
      const costTotal = portfolio.reduce((acc, s) => acc + s.buyPrice * s.quantity, 0)
      const snap = appendHistorySnapshot(currentTotal, currentTotal - costTotal)
      setHistory(snap)

    } catch (e) {
      setError('Erreur lors du fetch des prix : ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [portfolio, apiKeys.finnhub])

  // -------------------------------------------------------------------
  // ANALYSE IA
  // -------------------------------------------------------------------

  async function getAiSummary() {
    if (!apiKeys.claude) {
      setError('Ajoute ta cle Claude dans les parametres.')
      return
    }
    if (!Object.keys(quotes).length) {
      setError('Rafraichis les prix avant de lancer l\'analyse.')
      return
    }
    setAiLoading(true)
    setError('')
    try {
      const text = await fetchPortfolioSummary(portfolio, quotes, apiKeys.claude)
      setAiSummary(text)
    } catch (e) {
      setError('Erreur Claude API : ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  // -------------------------------------------------------------------
  // CRUD PORTFOLIO
  // -------------------------------------------------------------------

  /**
   * Ajoute une nouvelle position ou met a jour une existante (par id).
   * Sauvegarde immediatement dans localStorage.
   */
  function addOrUpdateStock(stock) {
    const idx = portfolio.findIndex(s => s.id === stock.id)
    const updated = idx >= 0
      ? portfolio.map(s => s.id === stock.id ? stock : s)
      : [...portfolio, stock]
    setPortfolio(updated)
    savePortfolio(updated)
  }

  function removeStock(id) {
    if (!confirm('Supprimer cette position ?')) return
    const updated = portfolio.filter(s => s.id !== id)
    setPortfolio(updated)
    savePortfolio(updated)
  }

  const hasKeys = !!apiKeys.finnhub

  // -------------------------------------------------------------------
  // RENDU
  // -------------------------------------------------------------------

  return (
    <div className="app-layout">

      {/* ---- Barre de navigation ---- */}
      <header className="topbar">
        <div className="topbar-logo">money</div>
        <div className="topbar-right">
          {lastRefresh && (
            <span className="text-muted text-sm">
              Mis a jour {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button className="btn-ghost btn-sm" onClick={refreshPrices} disabled={loading}>
            {loading ? 'Chargement...' : 'Rafraichir les prix'}
          </button>
          <button className="btn-ghost btn-sm" onClick={() => setShowSettings(true)}>
            Parametres
          </button>
        </div>
      </header>

      <main className="main">

        {/* ---- Banniere de premier lancement ---- */}
        {!hasKeys && (
          <div className="setup-banner mb-4">
            <p>
              Bienvenue ! Pour afficher les prix en direct, ouvre les{' '}
              <strong>Parametres</strong> et entre ta cle{' '}
              <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer">
                Finnhub
              </a>{' '}
              (gratuite). La cle Claude est optionnelle — elle active les analyses IA.
            </p>
          </div>
        )}

        {/* ---- Message d'erreur ---- */}
        {error && (
          <div style={{
            background: 'rgba(240,79,90,0.1)',
            border: '1px solid rgba(240,79,90,0.25)',
            borderRadius: 8, padding: '12px 16px',
            marginBottom: 16, fontSize: 13, color: 'var(--red)'
          }}>
            {error}
          </div>
        )}

        {/* ---- Cartes de resume ---- */}
        <div className="summary-row">
          <div className="summary-card">
            <div className="label">Valeur du portfolio</div>
            <div className="value">${fmt(totalValue)}</div>
          </div>
          <div className="summary-card">
            <div className="label">P&L total</div>
            <div className={`value ${pnlClass(totalPnl)}`}>
              {totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}
              <span style={{ fontSize: 14, marginLeft: 6 }}>({fmt(totalPnlPct)}%)</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="label">Variation du jour</div>
            <div className={`value ${pnlClass(dayPnl)}`}>
              {dayPnl >= 0 ? '+' : ''}${fmt(dayPnl)}
            </div>
          </div>
          <div className="summary-card">
            <div className="label">Positions</div>
            <div className="value">{portfolio.length}</div>
          </div>
        </div>

        {/* ---- Panneau d'analyse IA ---- */}
        <div className="ai-panel mb-6">
          <div className="ai-panel-header">
            <span className="ai-label">Analyse IA</span>
            <button className="btn-ghost btn-sm" onClick={getAiSummary} disabled={aiLoading}>
              {aiLoading ? 'Analyse en cours...' : 'Analyser le portfolio'}
            </button>
          </div>

          {aiLoading ? (
            <p className="ai-loading">Claude analyse tes positions...</p>
          ) : aiSummary ? (
            <p className="ai-text">{aiSummary}</p>
          ) : (
            <p className="ai-loading">
              {apiKeys.claude
                ? 'Clique sur "Analyser" pour un resume IA de tes gains et pertes.'
                : 'Ajoute une cle Claude dans les parametres pour activer l\'analyse IA.'}
            </p>
          )}
        </div>

        {/* ---- Tableau des positions ---- */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title" style={{ marginBottom: 0 }}>
              Positions
              <span className="pill">{portfolio.length}</span>
            </div>
            <button className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>
              + Ajouter
            </button>
          </div>

          {portfolio.length === 0 ? (
            <p className="text-muted text-sm" style={{ padding: '20px 0', textAlign: 'center' }}>
              Aucune position — clique sur "Ajouter" pour commencer.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Qte</th>
                    <th>Prix achat</th>
                    <th>Prix actuel</th>
                    <th>Jour</th>
                    <th>Valeur</th>
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
                        {r.dayChange != null
                          ? `${r.dayChange >= 0 ? '+' : ''}${fmt(r.dayChange)}%`
                          : '—'}
                      </td>
                      <td className="mono">
                        {/* Si pas de prix en direct, on affiche le cout d'achat comme fallback */}
                        {r.currentValue ? `$${fmt(r.currentValue)}` : `$${fmt(r.costBasis)}`}
                      </td>
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
                          <button
                            className="icon-btn"
                            onClick={() => { setEditStock(r); setShowAdd(true) }}
                            title="Modifier"
                          >
                            Editer
                          </button>
                          <button className="btn-danger" onClick={() => removeStock(r.id)}>
                            X
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ---- Graphique historique ---- */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title" style={{ marginBottom: 0 }}>
              Historique
              <span className="pill">90 derniers jours</span>
            </div>
            <div className="tabs">
              <button
                className={`tab ${chartView === 'pnl' ? 'active' : ''}`}
                onClick={() => setChartView('pnl')}
              >
                P&L
              </button>
              <button
                className={`tab ${chartView === 'value' ? 'active' : ''}`}
                onClick={() => setChartView('value')}
              >
                Valeur
              </button>
            </div>
          </div>
          <HistoryChart history={history} view={chartView} />
        </div>
      </main>

      {/* ---- Modals ---- */}
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
