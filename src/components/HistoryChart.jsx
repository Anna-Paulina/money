/**
 * HistoryChart.jsx
 * Graphique de l'historique du portfolio (P&L ou / et valeur totale).
 * Utilise Recharts (AreaChart) — bibliotheque React basee sur D3.
 *
 * Deux modes via la prop `view` :
 *   'pnl'   -> affiche le gain/perte cumulatif
 *   'value' -> affiche la valeur absolue du portfolio
 * Est ce que c'est comme ça qu'on fait ? je sais pas, mais je pense que ça marchera bien pour moi
 *
 * AMELIORATION POSSIBLE : ajouter un selecteur de plage de dates plutot que d'afficher toujours les 90 derniers jours.
 */
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

/**
 * Formate une date ISO (YYYY-MM-DD) en label lisible (ex: "Mar 25")
 * pour les axes X du graphique.
 */
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Tooltip personnalise affiche au survol d'un point du graphique.
 * Recharts injecte automatiquement active, payload et label.
 */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const pnl   = payload[0]?.value
  const value = payload[1]?.value

  return (
    <div style={{
      background: 'var(--bg3)',
      border: '1px solid var(--border2)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
    }}>
      <p style={{ color: 'var(--muted)', marginBottom: 4 }}>{formatDate(label)}</p>

      {value !== undefined && (
        <p style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
          Valeur : ${value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      )}

      {pnl !== undefined && (
        <p style={{ color: pnl >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
          P&L : {pnl >= 0 ? '+' : ''}${pnl?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      )}
    </div>
  )
}

export default function HistoryChart({ history, view }) {
  // Pas encore de donnees — premier lancement ou aucun refresh effectue
  if (!history?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
        Aucun historique — rafraichis les prix pour enregistrer le snapshot du jour.
      </div>
    )
  }

  // Couleur du graphique selon le mode affiche
  const dataKey = view === 'value' ? 'value' : 'pnl'
  const color   = view === 'value' ? '#7c6af7' : '#34d97b'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {/* Degrade sous la courbe — effet visuel, purement decoratif */}
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0}   />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />

        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: '#7b7e93', fontSize: 11, fontFamily: 'DM Mono' }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd"
        />

        <YAxis
          tick={{ fill: '#7b7e93', fontSize: 11, fontFamily: 'DM Mono' }}
          axisLine={false} tickLine={false} width={70}
          tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
          // NOTE : ce format suppose des valeurs en milliers de dollars.
          // Si le portfolio vaut moins de 1000$, les labels afficheront "0.1k"
          // ce qui est un peu bizarre. A ameliorer si besoin.
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Ligne de reference a zero — utile uniquement en mode P&L */}
        {view === 'pnl' && <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />}

        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill="url(#grad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
