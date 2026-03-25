/**
 * claudeAi.js
 * Appel a l'API Claude (Anthropic) pour generer un resume (mais faut payer, on verra si je le fais plus tard
 *
 * NOTE : cet appel se fait directement depuis le navigateur (client-side).
 * attention, c'est une clef unitaire
 *
 * AMELIORATION POSSIBLE : streamer la reponse token par token avec l'API streaming d'Anthropic pour un effet plus reactif.
 */

/**
 * Construit un prompt avec les donnees du portfolio et appelle Claude.
 * Retourne le texte de la reponse, ou lance une erreur.
 *
 */
export async function fetchPortfolioSummary(portfolio, quotes, apiKey) {
  // Construire une ligne de texte par position avec les chiffres cles
  const rows = portfolio.map(s => {
    const q = quotes[s.ticker]
    if (!q) return `${s.ticker}: aucune donnee disponible`

    const currentValue = q.price * s.quantity
    const costBasis    = s.buyPrice * s.quantity
    const pnl          = currentValue - costBasis
    const pnlPct       = ((pnl / costBasis) * 100).toFixed(2)

    return `${s.ticker}: ${s.quantity} actions @ $${s.buyPrice} achat -> $${q.price?.toFixed(2)} maintenant | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct}%) | Jour: ${q.changePercent >= 0 ? '+' : ''}${q.changePercent?.toFixed(2)}%`
  }).join('\n')

  const prompt = `Voici mon portfolio boursier aujourd'hui :

${rows}

Donne-moi une analyse concise en 2-3 phrases : meilleure et pire performance, tendance generale, et une observation sur le risque ou une opportunite. Sois direct et naturel.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  // PEUT CASSER : 401 = cle invalide, 429 = rate limit, 500 = probleme Anthropic
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)

  const data = await res.json()
  return data.content?.[0]?.text ?? 'Aucun resume disponible.'
}
