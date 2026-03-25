/**
 * storage.js
 * Gestion de la persistence locale via localStorage.
 *
 * Tout ce que l'utilisateur entre (portfolio, historique, cles API)
 * est stocke ici dans le navigateur. Aucune donnee ne part vers un serveur.
 *
 * ATTENTION : localStorage est synchrone et bloque le thread principal
 * si les donnees deviennent tres volumineuses. Pour l'instant ca tient
 * largement, mais si on ajoutait des milliers de snapshots
 * historiques, il faudrait passer a IndexedDB ou autre chse
 *
 * AMELIORATION POSSIBLE : chiffrer les cles API stockees ici,
 * meme si elles restent dans le navigateur de l'utilisateur
 * parce que c'est gratuit pour l'instant mais ça peut chnager
 */

const PORTFOLIO_KEY = 'money_portfolio'
const HISTORY_KEY   = 'money_history'
const KEYS_KEY      = 'money_apikeys'

// -------------------------------------------------------------------
// PORTFOLIO — liste des positions (ticker, quantite, prix d'achat)
// -------------------------------------------------------------------

export function loadPortfolio() {
  try {
    return JSON.parse(localStorage.getItem(PORTFOLIO_KEY)) || []
  } catch {
    // Si le JSON est corrompu pour une raison quelconque, on repart a zero
    return []
  }
}

export function savePortfolio(portfolio) {
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio))
}

// -------------------------------------------------------------------
// HISTORIQUE — un snapshot par jour (valeur totale + P&L)
// -------------------------------------------------------------------

/**
 * Charge l'historique des snapshots journaliers.
 * Chaque entree : { date: 'YYYY-MM-DD', value: number, pnl: number }
 */
export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
  } catch {
    return []
  }
}

/**
 * Ajoute ou remplace le snapshot du jour, puis tronque a 90 entrees.
 * Appele automatiquement apres chaque refresh des prix.
 *
 * NOTE : on utilise la date locale (toISOString coupe a 'T'),
 * ce qui peut sauter d'un jour si l'utilisateur est en UTC-X et
 * rafraichit juste apres minuit UTC. Pas grave pour un usage perso.
 */
export function appendHistorySnapshot(totalValue, totalPnl) {
  const history = loadHistory()
  const today = new Date().toISOString().split('T')[0]

  const idx = history.findIndex(h => h.date === today)
  const entry = { date: today, value: totalValue, pnl: totalPnl }

  if (idx >= 0) {
    history[idx] = entry  // on ecrase le snapshot existant du jour
  } else {
    history.push(entry)
  }

  // Garder seulement les 90 derniers jours
  const trimmed = history.slice(-90)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
  return trimmed
}

// -------------------------------------------------------------------
// CLES API — Finnhub et Claude
// -------------------------------------------------------------------

/**
 * SECURITE : les cles sont stockees en clair dans localStorage.
 * C'est acceptable pour un usage perso sur sa propre machine,
 * mais ce serait insuffisant dans un contexte multi-utilisateurs.
 * Ne jamais commiter ces cles dans le code source.
 */
export function loadApiKeys() {
  try {
    return JSON.parse(localStorage.getItem(KEYS_KEY)) || { finnhub: '', claude: '' }
  } catch {
    return { finnhub: '', claude: '' }
  }
}

export function saveApiKeys(keys) {
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys))
}
