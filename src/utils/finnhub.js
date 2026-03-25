/**
 * finnhub.js
 * Appels a l'API Finnhub pour recuperer les prix en temps reel
 * et le sentiment de marche par action.
 *
 * Finnhub free tier : 60 requetes / minute.
 * Si le portfolio contient beaucoup de tickers, on peut atteindre
 * la limite assez vite (fetchSentiment fait 1 requete par ticker).
 *
 * AMELIORATION POSSIBLE : ajouter un cache en memoire avec TTL
 * pour eviter de refetcher les memes donnees dans la meme session
 * mais ça non plus je sais pas faire
 */

const BASE = 'https://finnhub.io/api/v1'

/**
 * Recupere le prix courant et les variations pour un ticker donne.
 * Finnhub retourne :
 *   c  = current price (prix courant)
 *   d  = change (variation en $)
 *   dp = percent change (variation en %)
 *   pc = previous close (cloture precedente)
 *   h  = high du jour
 *   l  = low du jour
 *
 * PEUT CASSER : si Finnhub change sa structure de reponse,
 * ou si la cle est invalide (obvi), la fonction lance une erreur.
 */
export async function fetchQuote(ticker, apiKey) {
  const res = await fetch(`${BASE}/quote?symbol=${ticker.toUpperCase()}&token=${apiKey}`)
  if (!res.ok) throw new Error(`Finnhub error: ${res.status}`)
  const data = await res.json()
  return {
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    prevClose: data.pc,
    high: data.h,
    low: data.l,
  }
}

/**
 * Recupere les prix de tous les tickers en parallele (Promise.allSettled).
 * Les tickers en echec sont silencieusement ignores — la table affichera "—"
 * pour les colonnes concernees.
 *
 * NOTE : Promise.allSettled (vs Promise.all) empeche qu'un seul echec
 * annule tout le batch. C'est le bon choix ici.
 */
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

/**
 * Recupere le sentiment de marche pour un ticker via l'endpoint news-sentiment.
 * Finnhub retourne bullishPercent / bearishPercent sur les dernieres news.
 *
 * Seuil utilise : > 55% dans un sens = sentiment declare.
 * Ce seuil est arbitraire — peut etre ajuste.
 *
 * PEUT CASSER : endpoint disponible uniquement sur certains plans Finnhub.
 * Sur le free tier, la reponse peut etre vide ou retourner une erreur 403.
 * C'est pourquoi on retourne null en cas d'echec plutot que de planter.
 */
export async function fetchSentiment(ticker, apiKey) {
  try {
    const res = await fetch(`${BASE}/news-sentiment?symbol=${ticker.toUpperCase()}&token=${apiKey}`)
    if (!res.ok) return null
    const data = await res.json()
    const bull = data?.sentiment?.bullishPercent ?? 0
    const bear = data?.sentiment?.bearishPercent ?? 0
    if (bull > 0.55) return 'bullish'
    if (bear > 0.55) return 'bearish'
    return 'neutral'
  } catch {
    return null
  }
}
