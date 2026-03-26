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
    <div className="mt-3 bg-card border border-border rounded-xl p-4 animate-[fadeUp_0.2s_ease_both]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-text-primary">
          {ETF_SHORT_NAMES[etfA] || etfA} & {ETF_SHORT_NAMES[etfB] || etfB} — 共同持股 {stocks.length} 檔
        </span>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs">
          收起
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
        {stocks.map(s => (
          <div key={s.code} className="flex items-center justify-between px-3 py-1.5 rounded bg-bg text-xs">
            <span className="text-text-primary font-mono">{s.code}</span>
            <span className="text-text-muted">{s.name}</span>
            {s.weight_i != null && s.weight_j != null && (
              <span className="text-text-muted tabular-nums">
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
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-2xs text-text-muted" />
              {labels.map((l, j) => (
                <th key={j} className="p-2 text-2xs text-text-muted font-medium text-center whitespace-nowrap">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="p-2 text-2xs text-text-muted font-medium whitespace-nowrap text-right pr-3">
                  {labels[i]}
                </td>
                {row.map((count, j) => {
                  const isDiag = i === j
                  const isSelected = selected?.i === i && selected?.j === j
                  return (
                    <td key={j} className="p-1">
                      <button
                        onClick={() => !isDiag && setSelected(isSelected ? null : { i, j })}
                        disabled={isDiag}
                        className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold font-mono tabular-nums transition-all ${
                          isDiag
                            ? 'bg-card border border-border text-text-muted cursor-default'
                            : isSelected
                              ? 'ring-2 ring-accent scale-105'
                              : 'hover:scale-105 hover:ring-1 hover:ring-accent/50 cursor-pointer'
                        }`}
                        style={{
                          backgroundColor: isDiag ? undefined : cellColor(count, maxCount),
                          color: isDiag ? undefined : count / maxCount > 0.5 ? palette.text : palette.textMuted,
                          minWidth: '48px',
                          minHeight: '48px',
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

      {selected && selectedDetail && (
        <DetailPanel
          etfA={etf_ids[selected.i]}
          etfB={etf_ids[selected.j]}
          stocks={selectedDetail}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
