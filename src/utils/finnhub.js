const BASE = 'https://finnhub.io/api/v1'

export async function fetchQuote(ticker, apiKey) {
  const res = await fetch(`${BASE}/quote?symbol=${ticker.toUpperCase()}&token=${apiKey}`)
  if (!res.ok) throw new Error(`Finnhub error: ${res.status}`)
  const data = await res.json()
  // c = current, pc = previous close, d = change, dp = change%
  return {
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    prevClose: data.pc,
    high: data.h,
    low: data.l,
  }
}

// Fetch quotes for all tickers in parallel
export async function fetchAllQuotes(tickers, apiKey) {
  const results = await Promise.allSettled(
    tickers.map(t => fetchQuote(t, apiKey).then(q => ({ ticker: t, ...q })))
  )
  const map = {}
  results.forEach(r => {
    if (r.status === 'fulfilled') map[r.value.ticker] = r.value
  })
  return map
}

// Market sentiment via general market news sentiment
// Finnhub free: /news-sentiment?symbol=AAPL returns sentiment for a stock
export async function fetchSentiment(ticker, apiKey) {
  try {
    const res = await fetch(`${BASE}/news-sentiment?symbol=${ticker.toUpperCase()}&token=${apiKey}`)
    if (!res.ok) return null
    const data = await res.json()
    // buzz.weeklyAverage > 1 = bullish; sentiment.bearishPercent / bullishPercent
    const bull = data?.sentiment?.bullishPercent ?? 0
    const bear = data?.sentiment?.bearishPercent ?? 0
    if (bull > 0.55) return 'bullish'
    if (bear > 0.55) return 'bearish'
    return 'neutral'
  } catch { return null }
}
