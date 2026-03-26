import { NavLink, Link, Outlet } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import { BASE_URL, RISK_LEVEL_COLORS } from '../../lib/constants'
import { formatUpdateTime } from '../../lib/formatters'

const NAV_ITEMS = [
  { to: '/dashboard', label: '戰略儀表板' },
  { to: '/risk', label: '風險訊號' },
  { to: '/holdings', label: '00981A' },
  { to: '/copy-trading', label: '跟單策略' },
  { to: '/strategy', label: '策略回測' },
  { to: '/history', label: '歷史回溯' },
  { to: '/news', label: '新聞' },
  { to: '/0050', label: '0050' },
  { to: '/ai-qa', label: 'AI' },
  { to: '/trump', label: 'US Trump' },
  { to: '/tsmc-vol', label: 'TSMC Vol' },
]


function timeSince(isoString: string): { text: string; stale: boolean } {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return { text: `${mins}m ago`, stale: false }
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return { text: `${hrs}h ago`, stale: hrs > 6 }
  const days = Math.floor(hrs / 24)
  return { text: `${days}d ago`, stale: true }
}

interface StatusItem {
  label: string
  time: string | null | undefined
}

function SystemHealth({ items }: { items: StatusItem[] }) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-1.5 flex flex-wrap gap-x-4 gap-y-1">
      {items.map(({ label, time }) => {
        if (!time) return (
          <span key={label} className="text-2xs font-mono text-text-muted">
            {label}: <span className="text-red-400">N/A</span>
          </span>
        )
        const { text, stale } = timeSince(time)
        return (
          <span key={label} className="text-2xs font-mono text-text-muted">
            {label}: <span className={stale ? 'text-red-400' : 'text-green-400'}>{text}</span>
          </span>
        )
      })}
    </div>
  )
}

export function Layout() {
  const { isLoading, error, dashboard, strategy, updateStatus, macroStatus, newsAnalysis, tsmcVolSignal } = useData()

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-11">
            <div className="flex items-center gap-3">
              <img
                src={`${BASE_URL}assets/logo-shanhai-joyle.png`}
                alt="Shanhai Joyle Capital"
                className="h-7 rounded"
              />
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-accent tracking-tight font-display">JOY88</span>
                <span className="text-2xs text-text-muted font-medium tracking-wider uppercase hidden sm:inline">ETF Dashboard</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {dashboard && (
                <span className="text-2xs text-text-muted font-mono">
                  DATA {dashboard.report_date}
                </span>
              )}
              {updateStatus?.status === 'success' && (
                <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                  Pipeline OK {formatUpdateTime(updateStatus.pipeline_completed_at)}
                </span>
              )}
            </div>
          </div>
          <nav className="flex gap-0.5 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-hide items-center" role="navigation" aria-label="Main navigation">
            {strategy?.risk_signals && (() => {
              const rs = strategy.risk_signals
              const color = RISK_LEVEL_COLORS[rs.level] || RISK_LEVEL_COLORS.green
              const glowCls = rs.level === 'red' || rs.level === 'high'
                ? 'animate-[pulse-glow-danger_1.2s_ease-in-out_infinite]'
                : rs.level === 'yellow' || rs.level === 'medium'
                  ? 'animate-[pulse-glow-warning_3s_ease-in-out_infinite]'
                  : ''
              return (
                <Link to="/risk" className={`flex items-center gap-1.5 px-2.5 py-1.5 mr-1 rounded-lg bg-card border border-border hover:bg-card-hover transition-colors shrink-0 ${glowCls}`}>
                  <span className="text-sm font-bold font-mono tabular-nums" style={{ color }}>{rs.score}</span>
                  <span className="text-2xs text-text-muted">/{rs.max_score}</span>
                </Link>
              )
            })()}
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-2.5 min-h-[44px] min-w-[44px] justify-center flex items-center rounded-md text-xs font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                    isActive
                      ? 'bg-accent text-[#0b0d14] font-semibold'
                      : 'text-text-muted hover:text-text-primary hover:bg-card-hover'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-text-muted text-sm">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-up text-sm">{error}</div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <footer className="border-t border-border mt-6">
        <SystemHealth items={[
          { label: 'ETF Pipeline', time: updateStatus?.pipeline_completed_at },
          { label: 'Macro', time: macroStatus?.macro_updated_at },
          { label: 'News', time: newsAnalysis?.updated_at },
          { label: 'TSMC Vol', time: tsmcVolSignal?.更新時間?.replace(' ', 'T') },
        ]} />
        <div className="max-w-[1400px] mx-auto px-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${BASE_URL}assets/logo-shanhai-joyle.png`} alt="" className="h-4 rounded opacity-60" />
            <span className="text-2xs text-text-muted">Shanhai Joyle Capital</span>
          </div>
          <span className="text-2xs text-text-muted">
            JOY88 &copy; {new Date().getFullYear()} | 資料僅供參考，不構成投資建議
          </span>
        </div>
      </footer>
    </div>
  )
}
