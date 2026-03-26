import { useState } from 'react'
import { ETF_SHORT_NAMES, palette } from '../../lib/constants'
import type { HoldingsOverlap, SharedStock } from '../../types/strategy'

function cellColor(count: number, maxCount: number): string {
  if (maxCount === 0) return 'transparent'
  const ratio = count / maxCount
  const alpha = 0.15 + ratio * 0.65
  return `rgba(224, 159, 62, ${alpha})`
}

interface DetailPanelProps {
  etfA: string
  etfB: string
  stocks: SharedStock[]
  onClose: () => void
}

function DetailPanel({ etfA, etfB, stocks, onClose }: DetailPanelProps) {
  return (
    <div className="flex-1 bg-bg/50 border border-border rounded-xl p-3 animate-[fadeUp_0.15s_ease_both] min-w-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-text-primary truncate">
          {ETF_SHORT_NAMES[etfA] || etfA} & {ETF_SHORT_NAMES[etfB] || etfB} ({stocks.length})
        </span>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary text-2xs ml-2 shrink-0">
          x
        </button>
      </div>
      <div className="space-y-0.5 max-h-52 overflow-y-auto">
        {stocks.map(s => (
          <div key={s.code} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-card text-2xs">
            <span className="text-text-primary font-mono w-10 shrink-0">{s.code}</span>
            <span className="text-text-muted truncate flex-1">{s.name}</span>
            {s.weight_i != null && s.weight_j != null && (
              <span className="text-text-tertiary tabular-nums shrink-0">
                {s.weight_i.toFixed(1)}% / {s.weight_j.toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function OverlapHeatmap({ data }: { data: HoldingsOverlap }) {
  const [selected, setSelected] = useState<{ i: number; j: number } | null>(null)
  const { matrix, etf_ids, shared_details } = data
  const n = etf_ids.length

  // Find max off-diagonal value for color scaling
  let maxCount = 0
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (i !== j && matrix[i][j] > maxCount) maxCount = matrix[i][j]

  const labels = etf_ids.map(id => ETF_SHORT_NAMES[id] || id)

  const selectedDetail = selected && selected.i !== selected.j
    ? (() => {
        const key = `${etf_ids[selected.i]}_${etf_ids[selected.j]}`
        const keyAlt = `${etf_ids[selected.j]}_${etf_ids[selected.i]}`
        return shared_details[key] || shared_details[keyAlt] || []
      })()
    : null

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Compact heatmap */}
      <div className="shrink-0">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="p-1 text-2xs text-text-muted" />
              {labels.map((l, j) => (
                <th key={j} className="p-1 text-2xs text-text-muted font-medium text-center whitespace-nowrap">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="p-1 text-2xs text-text-muted font-medium whitespace-nowrap text-right pr-2">
                  {labels[i]}
                </td>
                {row.map((count, j) => {
                  const isDiag = i === j
                  const isSelected = selected?.i === i && selected?.j === j
                  return (
                    <td key={j} className="p-0.5">
                      <button
                        onClick={() => !isDiag && setSelected(isSelected ? null : { i, j })}
                        disabled={isDiag}
                        className={`w-9 h-9 rounded flex items-center justify-center text-2xs font-bold font-mono tabular-nums transition-all ${
                          isDiag
                            ? 'bg-card border border-border text-text-tertiary cursor-default'
                            : isSelected
                              ? 'ring-2 ring-accent'
                              : 'hover:ring-1 hover:ring-accent/50 cursor-pointer'
                        }`}
                        style={{
                          backgroundColor: isDiag ? undefined : cellColor(count, maxCount),
                          color: isDiag ? undefined : count / maxCount > 0.5 ? palette.text : palette.textMuted,
                        }}
                      >
                        {count}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel (inline right on desktop, below on mobile) */}
      {selected && selectedDetail ? (
        <DetailPanel
          etfA={etf_ids[selected.i]}
          etfB={etf_ids[selected.j]}
          stocks={selectedDetail}
          onClose={() => setSelected(null)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-text-tertiary py-6">
          點擊格子查看共同持股
        </div>
      )}
    </div>
  )
}
