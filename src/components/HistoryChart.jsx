import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const pnl = payload[0]?.value
  const value = payload[1]?.value
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border2)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: 'var(--muted)', marginBottom: 4 }}>{formatDate(label)}</p>
      {value !== undefined && (
        <p style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
          Value: ${value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      )}
      {pnl !== undefined && (
        <p style={{ color: pnl >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
          P&L: {pnl >= 0 ? '+' : ''}${pnl?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      )}
    </div>
  )
}

export default function HistoryChart({ history, view }) {
  if (!history?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
        No history yet — refresh prices to log today's snapshot.
      </div>
    )
  }

  const dataKey = view === 'value' ? 'value' : 'pnl'
  const color = view === 'value' ? '#7c6af7' : '#34d97b'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="date" tickFormatter={formatDate}
          tick={{ fill: '#7b7e93', fontSize: 11, fontFamily: 'DM Mono' }}
          axisLine={false} tickLine={false} interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#7b7e93', fontSize: 11, fontFamily: 'DM Mono' }}
          axisLine={false} tickLine={false} width={70}
          tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        {view === 'pnl' && <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />}
        <Area
          type="monotone" dataKey={dataKey}
          stroke={color} strokeWidth={2}
          fill="url(#grad)" dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
