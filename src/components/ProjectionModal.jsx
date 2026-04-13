/**
 * ProjectionModal.jsx
 * Modale plein ecran de projection du portfolio sur 15 ans.
 *
 * Logique de calcul :
 *   On part de la valeur actuelle du portfolio (ou du cout d'achat
 *   si les prix n'ont pas encore ete rafraichis), et on applique
 *   chaque mois : valeur = (valeur + apport) * (1 + tauxAnnuel/12)
 *
 *   C'est la formule des interets composes avec apports periodiques.
 *   Simple mais suffisante pour une projection indicative.
 *
 * Trois courbes affichees :
 *   - Pessimiste  : taux - 3%
 *   - Base        : taux saisi
 *   - Optimiste   : taux + 3%
 *
 * AMELIORATION POSSIBLE : ajouter l'inflation pour afficher la valeur
 * reelle en plus de la valeur nominale. 7% nominal = ~4.5% reel historiquement.
 *
 * AMELIORATION POSSIBLE : permettre des apports variables dans le temps
 * (ex: augmenter de X% par an), ce qui serait plus realiste.
 *
 * NOTE APPRENTISSAGE : c'est la premiere fois que j'utilise Recharts
 * avec plusieurs <Line> sur le meme graphique. Le composant Legend
 * est genere automatiquement a partir des dataKeys — pratique.
 */

import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { fetchPortfolioSummary } from '../utils/claudeAi'

// -------------------------------------------------------------------
// CALCUL DE PROJECTION
// -------------------------------------------------------------------

/**
 * Calcule les valeurs annuelles sur `years` ans.
 * Retourne un tableau d'objets { year, pessimiste, base, optimiste, apportsSeuls }
 *
 * `apportsSeuls` represente ce que tu aurais en mettant l'argent
 * sous le matelas — utile comme reference visuelle.
 *
 * @param {number} startValue    - valeur initiale du portfolio ($)
 * @param {number} monthlyInput  - apport mensuel ($)
 * @param {number} annualRate    - taux annuel en % (ex: 7 pour 7%)
 * @param {number} years         - horizon en annees
 */
function computeProjection(startValue, monthlyInput, annualRate, years = 15) {
  const rates = {
    pessimiste: Math.max(0, (annualRate - 3) / 100),
    base:       annualRate / 100,
    optimiste:  (annualRate + 3) / 100,
  }

  // On calcule mois par mois pour chaque scenario
  let vals = {
    pessimiste: startValue,
    base:       startValue,
    optimiste:  startValue,
    apportsSeuls: startValue,
  }

  const points = [{ year: 0, ...Object.fromEntries(
    Object.entries(vals).map(([k, v]) => [k, Math.round(v)])
  )}]

  for (let month = 1; month <= years * 12; month++) {
    for (const key of ['pessimiste', 'base', 'optimiste']) {
      vals[key] = (vals[key] + monthlyInput) * (1 + rates[key] / 12)
    }
    vals.apportsSeuls += monthlyInput

    // On enregistre un point par annee seulement (pas besoin des 180 mois)
    if (month % 12 === 0) {
      points.push({
        year: month / 12,
        pessimiste:   Math.round(vals.pessimiste),
        base:         Math.round(vals.base),
        optimiste:    Math.round(vals.optimiste),
        apportsSeuls: Math.round(vals.apportsSeuls),
      })
    }
  }

  return points
}

// -------------------------------------------------------------------
// FORMATAGE
// -------------------------------------------------------------------

function fmtMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
  return `$${n}`
}

function fmtAxis(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`
  return `$${n}`
}

// -------------------------------------------------------------------
// TOOLTIP PERSONNALISE
// -------------------------------------------------------------------

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg3)',
      border: '1px solid var(--border2)',
      borderRadius: 8,
      padding: '12px 16px',
      fontSize: 13,
      minWidth: 200,
    }}>
      <p style={{ color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
        An {label}
      </p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
          {p.name} : {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  )
}

// -------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// -------------------------------------------------------------------

export default function ProjectionModal({ portfolioValue, claudeApiKey, onClose }) {
  const [monthlyInput, setMonthlyInput] = useState(500)
  const [annualRate,   setAnnualRate]   = useState(7)
  const [aiComment,    setAiComment]    = useState('')
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiError,      setAiError]      = useState('')

  // Recalcul automatique a chaque changement de parametre
  const data = useMemo(
    () => computeProjection(portfolioValue, monthlyInput, annualRate, 15),
    [portfolioValue, monthlyInput, annualRate]
  )

  const finalBase       = data[data.length - 1]?.base ?? 0
  const finalOptimiste  = data[data.length - 1]?.optimiste ?? 0
  const finalPessimiste = data[data.length - 1]?.pessimiste ?? 0
  const totalApports    = monthlyInput * 12 * 15

  /**
   * Demande a Claude un commentaire sur la projection.
   * On lui passe les chiffres cles — pas besoin d'envoyer tout le tableau.
   *
   * PEUT CASSER : si la cle Claude est absente ou invalide, on affiche
   * un message d'erreur sans planter le reste de la modale.
   */
  async function getAiComment() {
    if (!claudeApiKey) {
      setAiError('Ajoute une cle Claude dans les parametres pour activer cette fonction.')
      return
    }
    setAiLoading(true)
    setAiError('')
    try {
      const prompt = `Voici une projection de portfolio boursier sur 15 ans :
- Valeur actuelle : ${fmtMoney(portfolioValue)}
- Apport mensuel : $${monthlyInput}
- Taux de rendement annuel suppose : ${annualRate}%
- Total apports sur 15 ans : ${fmtMoney(totalApports)}
- Valeur finale scenario pessimiste (${annualRate - 3}%) : ${fmtMoney(finalPessimiste)}
- Valeur finale scenario de base (${annualRate}%) : ${fmtMoney(finalBase)}
- Valeur finale scenario optimiste (${annualRate + 3}%) : ${fmtMoney(finalOptimiste)}

Commente cette projection en 2-3 phrases. Sois concret, mentionne l'effet des interets composes, et donne une perspective realiste. Pas de mise en garde legale, juste une analyse directe.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const d = await res.json()
      setAiComment(d.content?.[0]?.text ?? '')
    } catch (e) {
      setAiError('Erreur Claude : ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  // Fermeture avec la touche Echap
  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose()
  }

  return (
    /*
     * NOTE APPRENTISSAGE — MODALE PLEIN ECRAN :
     * position:fixed + inset:0 couvre toute la fenetre par-dessus le contenu.
     * overflow-y:auto permet le scroll si la modale est plus haute que l'ecran.
     * onKeyDown necessite tabIndex pour que le div soit focusable et capte les events clavier.
     */
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg)',
        zIndex: 200,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {/* ---- En-tete ---- */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 32px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: 'var(--bg)', zIndex: 10,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 20 }}>
            Projection 15 ans
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
            Depuis une valeur actuelle de {fmtMoney(portfolioValue)}
          </div>
        </div>
        <button className="btn-ghost" onClick={onClose}>Fermer</button>
      </div>

      {/* ---- Contenu principal ---- */}
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '32px' }}>

        {/* ---- Parametres ---- */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32,
        }}>
          <div className="card">
            <label>APPORT MENSUEL ($)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
              <input
                type="range" min={0} max={5000} step={50}
                value={monthlyInput}
                onChange={e => setMonthlyInput(+e.target.value)}
                style={{ flex: 1, accentColor: 'var(--accent)' }}
              />
              <input
                type="number" min={0} step={50}
                value={monthlyInput}
                onChange={e => setMonthlyInput(Math.max(0, +e.target.value))}
                style={{ width: 100, fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
              Total apporte sur 15 ans : {fmtMoney(totalApports)}
            </p>
          </div>

          <div className="card">
            <label>TAUX DE RENDEMENT ANNUEL (%)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
              <input
                type="range" min={1} max={20} step={0.5}
                value={annualRate}
                onChange={e => setAnnualRate(+e.target.value)}
                style={{ flex: 1, accentColor: 'var(--accent)' }}
              />
              <input
                type="number" min={1} max={20} step={0.5}
                value={annualRate}
                onChange={e => setAnnualRate(Math.min(20, Math.max(1, +e.target.value)))}
                style={{ width: 80, fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
              7% = rendement historique moyen S&P 500 (apres inflation : ~4.5%)
            </p>
          </div>
        </div>

        {/* ---- Cartes de resultat ---- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <div className="card" style={{ borderColor: 'rgba(240,79,90,0.3)' }}>
            <div className="label">Pessimiste ({annualRate - 3}%)</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: 'var(--red)', marginTop: 6 }}>
              {fmtMoney(finalPessimiste)}
            </div>
          </div>
          <div className="card" style={{ borderColor: 'rgba(124,106,247,0.4)' }}>
            <div className="label">Base ({annualRate}%)</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: 'var(--accent)', marginTop: 6 }}>
              {fmtMoney(finalBase)}
            </div>
          </div>
          <div className="card" style={{ borderColor: 'rgba(52,217,123,0.3)' }}>
            <div className="label">Optimiste ({annualRate + 3}%)</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: 'var(--green)', marginTop: 6 }}>
              {fmtMoney(finalOptimiste)}
            </div>
          </div>
        </div>

        {/* ---- Graphique ---- */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="section-title">Courbe de projection</div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="year"
                tickFormatter={v => `An ${v}`}
                tick={{ fill: '#7b7e93', fontSize: 11, fontFamily: 'DM Mono' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={fmtAxis}
                tick={{ fill: '#7b7e93', fontSize: 11, fontFamily: 'DM Mono' }}
                axisLine={false} tickLine={false} width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-head)', paddingTop: 16 }}
              />
              {/* Ligne de reference = valeur initiale */}
              <ReferenceLine y={portfolioValue} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
              <Line dataKey="apportsSeuls" name="Sans rendement"  stroke="#444" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              <Line dataKey="pessimiste"   name={`Pessimiste (${annualRate-3}%)`} stroke="var(--red)"    strokeWidth={2} dot={false} />
              <Line dataKey="base"         name={`Base (${annualRate}%)`}         stroke="var(--accent)" strokeWidth={2.5} dot={false} />
              <Line dataKey="optimiste"    name={`Optimiste (${annualRate+3}%)`}  stroke="var(--green)"  strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ---- Commentaire IA ---- */}
        <div className="ai-panel">
          <div className="ai-panel-header">
            <span className="ai-label">Analyse IA de la projection</span>
            <button className="btn-ghost btn-sm" onClick={getAiComment} disabled={aiLoading}>
              {aiLoading ? 'Analyse en cours...' : 'Commenter'}
            </button>
          </div>
          {aiLoading && <p className="ai-loading">Claude analyse ta projection...</p>}
          {aiError   && <p style={{ color: 'var(--red)', fontSize: 13 }}>{aiError}</p>}
          {aiComment && !aiLoading && <p className="ai-text">{aiComment}</p>}
          {!aiComment && !aiLoading && !aiError && (
            <p className="ai-loading">
              {claudeApiKey
                ? 'Clique sur "Commenter" pour une analyse de cette projection.'
                : 'Ajoute une cle Claude dans les parametres pour activer cette fonction.'}
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
