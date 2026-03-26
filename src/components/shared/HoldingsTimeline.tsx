import { useState, useMemo } from 'react'
import { SIGNAL_COLORS, palette } from '../../lib/constants'
import type { DailyChange } from '../../types'

interface TimelineEvent {
  date: string
  code: string
  name: string
  type: string
  weight: number
  weight_chg: number
}

function flattenChanges(changes: DailyChange[]): TimelineEvent[] {
  const events: TimelineEvent[] = []
  for (const day of changes) {
    for (const s of day.new || [])
      events.push({ date: day.date, code: s.code, name: s.name, type: '新增', weight: s.weight, weight_chg: s.weight })
    for (const s of day.added || [])
      events.push({ date: day.date, code: s.code, name: s.name, type: '加碼', weight: s.weight, weight_chg: s.weight_chg })
    for (const s of day.reduced || [])
      events.push({ date: day.date, code: s.code, name: s.name, type: '減碼', weight: s.weight, weight_chg: s.weight_chg })
    for (const s of day.exited || [])
      events.push({ date: day.date, code: s.code, name: s.name, type: '退出', weight: 0, weight_chg: -(s.prev_weight || 0) })
  }
  return events.sort((a, b) => b.date.localeCompare(a.date))
}

const TYPE_ICON: Record<string, string> = { '新增': '+', '加碼': '\u25B2', '減碼': '\u25BC', '退出': '\u00D7' }

export function HoldingsTimeline({ changes, limit = 50 }: { changes: DailyChange[]; limit?: number }) {
  const [stockFilter, setStockFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const allEvents = useMemo(() => flattenChanges(changes), [changes])

  const filtered = useMemo(() => {
    let result = allEvents
    if (stockFilter)
      result = result.filter(e => e.code.includes(stockFilter) || e.name.includes(stockFilter))
    if (typeFilter)
      result = result.filter(e => e.type === typeFilter)
    return result.slice(0, limit)
  }, [allEvents, stockFilter, typeFilter, limit])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>()
    for (const e of filtered) {
      const arr = map.get(e.date) || []
      arr.push(e)
      map.set(e.date, arr)
    }
    return [...map.entries()]
  }, [filtered])

  const types = ['新增', '加碼', '減碼', '退出']

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="搜尋股票代號/名稱..."
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-bg border border-border text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent w-48"
        />
        <div className="flex gap-1">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              className={`px-2.5 py-1.5 rounded-md text-2xs font-semibold transition-colors ${
                typeFilter === t
                  ? 'text-bg'
                  : 'text-text-muted hover:text-text-primary hover:bg-card-hover'
              }`}
              style={typeFilter === t ? { backgroundColor: SIGNAL_COLORS[t] || palette.accent } : undefined}
            >
              {TYPE_ICON[t]} {t}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />

        {grouped.map(([date, events]) => (
          <div key={date} className="mb-4">
            {/* Date marker */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-card border-2 border-border flex items-center justify-center z-10 shrink-0">
                <span className="text-2xs font-bold text-accent tabular-nums">{date.slice(5)}</span>
              </div>
              <span className="text-xs text-text-muted">{date}</span>
            </div>

            {/* Events for this date */}
            <div className="ml-[42px] space-y-1.5">
              {events.map((e, idx) => {
                const color = SIGNAL_COLORS[e.type] || palette.accent
                return (
                  <div key={`${e.code}-${idx}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-card-hover transition-colors text-xs">
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-2xs font-bold shrink-0"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {TYPE_ICON[e.type]}
                    </span>
                    <span className="font-mono text-text-primary w-12 shrink-0">{e.code}</span>
                    <span className="text-text-muted truncate flex-1">{e.name}</span>
                    <span className="tabular-nums font-mono shrink-0" style={{ color }}>
                      {e.weight_chg >= 0 ? '+' : ''}{e.weight_chg.toFixed(2)}%
                    </span>
                    <span className="text-text-tertiary tabular-nums shrink-0">{e.weight.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <div className="text-center text-text-muted text-sm py-8">無符合條件的異動記錄</div>
        )}
      </div>
    </div>
  )
}
