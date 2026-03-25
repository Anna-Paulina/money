const PORTFOLIO_KEY = 'stocktracker_portfolio'
const HISTORY_KEY = 'stocktracker_history'
const KEYS_KEY = 'stocktracker_apikeys'

// Portfolio
export function loadPortfolio() {
  try {
    return JSON.parse(localStorage.getItem(PORTFOLIO_KEY)) || []
  } catch { return [] }
}

export function savePortfolio(portfolio) {
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio))
}

// P&L History — one snapshot per day
export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
  } catch { return [] }
}

export function appendHistorySnapshot(totalValue, totalPnl) {
  const history = loadHistory()
  const today = new Date().toISOString().split('T')[0]
  // Replace today's entry if it exists
  const idx = history.findIndex(h => h.date === today)
  const entry = { date: today, value: totalValue, pnl: totalPnl }
  if (idx >= 0) history[idx] = entry
  else history.push(entry)
  // Keep last 90 days
  const trimmed = history.slice(-90)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
  return trimmed
}

// API keys
export function loadApiKeys() {
  try {
    return JSON.parse(localStorage.getItem(KEYS_KEY)) || { finnhub: '', claude: '' }
  } catch { return { finnhub: '', claude: '' } }
}

export function saveApiKeys(keys) {
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys))
}
