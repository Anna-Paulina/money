export async function fetchPortfolioSummary(portfolio, quotes, apiKey) {
  const rows = portfolio.map(s => {
    const q = quotes[s.ticker]
    if (!q) return `${s.ticker}: no data`
    const currentValue = q.price * s.quantity
    const costBasis = s.buyPrice * s.quantity
    const pnl = currentValue - costBasis
    const pnlPct = ((pnl / costBasis) * 100).toFixed(2)
    return `${s.ticker}: ${s.quantity} shares @ $${s.buyPrice} buy → $${q.price?.toFixed(2)} now | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct}%) | Day: ${q.changePercent >= 0 ? '+' : ''}${q.changePercent?.toFixed(2)}%`
  }).join('\n')

  const prompt = `Here is my stock portfolio today:

${rows}

Give me a concise, sharp 2-3 sentence analysis of my portfolio performance today. Mention the best and worst performers, overall trend, and one brief observation about risk or opportunity. Be direct and conversational — no fluff.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? 'No summary available.'
}
