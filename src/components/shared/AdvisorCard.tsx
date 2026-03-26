import type { Advisory } from '../../types/advisor'

const SIGNAL_CONFIG = {
  '攻擊': { bg: 'bg-down/10', text: 'text-down', border: 'border-down' },
  '防守': { bg: 'bg-up/10', text: 'text-up', border: 'border-up' },
  '觀望': { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning' },
} as const

const SOURCE_NAMES: Record<string, string> = {
  dashboard: '持倉',
  strategy: '策略',
  news_analysis: '新聞',
  ai_research: 'AI',
  tsmc_vol_signal: 'TSMC',
}

function formatTimestamp(iso: string, phase: string): string {
  try {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${mm}/${dd} ${hh}:${min} ${phase}`
  } catch {
    return phase
  }
}

function isStale(iso: string): boolean {
  try {
    return Date.now() - new Date(iso).getTime() > 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

interface Props {
  advisory: Advisory | null | undefined
  riskScore?: string
  isLoading?: boolean
}

export function AdvisorCard({ advisory, riskScore, isLoading }: Props) {
  // Loading state
  if (isLoading) {
    return <div className="bg-card animate-pulse rounded-xl h-[200px]" />
  }

  // Empty / error — render nothing
  if (!advisory) return null

  const signal = SIGNAL_CONFIG[advisory.overall_signal] ?? SIGNAL_CONFIG['觀望']
  const stale = isStale(advisory.generated_at)

  return (
    <section aria-labelledby="advisor-title" className="bg-card border border-border rounded-xl overflow-hidden">
      <h2 id="advisor-title" className="sr-only">AI Advisor</h2>

      {/* Stale warning */}
      {stale && (
        <div className="border-t-2 border-warning px-4 py-1.5 text-xs text-warning">
          資料產生於 {Math.round((Date.now() - new Date(advisory.generated_at).getTime()) / 3600000)} 小時前
        </div>
      )}

      {/* Signal bar */}
      <div className={`${signal.bg} py-3 px-4 sm:px-5 flex items-center justify-between`}>
        <div className={`text-xl font-bold ${signal.text}`}>
          {advisory.overall_signal}
        </div>
        <div className="text-sm text-text-muted">
          {formatTimestamp(advisory.generated_at, advisory.market_phase)}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Action items */}
        {advisory.action_items.length > 0 && (
          <ol className="space-y-2">
            {advisory.action_items.slice(0, 3).map((item, i) => (
              <li key={i}>
                <div className="text-sm font-medium text-text-primary">
                  {'①②③'[i]} {item.action}
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {item.framework} · {item.reasoning}
                </div>
              </li>
            ))}
          </ol>
        )}

        {/* Market summary (collapsible) */}
        {advisory.market_summary && (
          <details className="group">
            <summary className="text-sm font-medium text-text-primary cursor-pointer select-none hover:text-accent transition-colors">
              ▸ 市場總結
            </summary>
            <div className="text-sm text-text-muted leading-relaxed mt-1.5 max-h-[200px] overflow-y-auto">
              <p>{advisory.market_summary}</p>
              {advisory.risk_assessment && (
                <p className="mt-2">{advisory.risk_assessment}</p>
              )}
            </div>
          </details>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs text-text-muted">
          {/* Data completeness dots */}
          <div className="flex items-center gap-1.5" aria-label={`資料完整度 ${Object.values(advisory.data_sources).filter(s => s.fresh).length}/${Object.keys(advisory.data_sources).length}`}>
            {Object.entries(advisory.data_sources).map(([key, src]) => (
              <span
                key={key}
                className={`w-1.5 h-1.5 rounded-full ${src.fresh ? 'bg-down' : advisory.data_gaps.includes(key) ? 'bg-text-muted/30' : 'bg-warning'}`}
                title={`${SOURCE_NAMES[key] ?? key}: ${src.fresh ? '最新' : '過期'}`}
              />
            ))}
            {/* Trend */}
            {advisory.date && <span className="ml-1.5">{advisory.date}</span>}
          </div>

          {/* Risk reference */}
          {riskScore && (
            <span>風控 {riskScore}</span>
          )}
        </div>

        {/* Data gaps warning */}
        {advisory.data_gaps.length > 0 && (
          <div className="text-xs text-warning">
            缺失: {advisory.data_gaps.map(k => SOURCE_NAMES[k] ?? k).join(', ')}
          </div>
        )}
      </div>
    </section>
  )
}
