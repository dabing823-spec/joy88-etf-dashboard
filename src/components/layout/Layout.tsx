import { NavLink, Outlet } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import { BASE_URL } from '../../lib/constants'

const NAV_ITEMS = [
  { to: '/dashboard', label: '\uD83C\uDFAF 戰略儀表板' },
  { to: '/risk', label: '\uD83D\uDEE1 風險訊號' },
  { to: '/holdings', label: '\uD83D\uDCCA 00981A' },
  { to: '/copy-trading', label: '\uD83D\uDCCB 跟單策略' },
  { to: '/strategy', label: '\uD83E\uDDE0 策略回測' },
  { to: '/history', label: '\uD83D\uDD0D 歷史回溯' },
  { to: '/0050', label: '\uD83C\uDFDB 0050' },
  { to: '/ai-qa', label: '\uD83E\uDD16 AI' },
  { to: '/news', label: '\uD83D\uDCF0 新聞' },
  { to: '/trump', label: '\uD83C\uDDFA\uD83C\uDDF8 Trump' },
]

function formatUpdateTime(isoString: string): string {
  const d = new Date(isoString)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

export function Layout() {
  const { isLoading, error, dashboard, updateStatus } = useData()

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
                <span className="text-sm font-bold text-accent tracking-tight">JOY88</span>
                <span className="text-[10px] text-text-muted font-medium tracking-wider uppercase hidden sm:inline">ETF Dashboard</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {dashboard && (
                <span className="text-[10px] text-text-muted font-mono">
                  DATA {dashboard.report_date}
                </span>
              )}
              {updateStatus?.status === 'success' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                  Pipeline OK {formatUpdateTime(updateStatus.pipeline_completed_at)}
                </span>
              )}
            </div>
          </div>
          <nav className="flex gap-0.5 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-hide">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-accent text-white'
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

      <footer className="border-t border-border py-3 mt-6">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${BASE_URL}assets/logo-shanhai-joyle.png`} alt="" className="h-4 rounded opacity-60" />
            <span className="text-[10px] text-text-muted">Shanhai Joyle Capital</span>
          </div>
          <span className="text-[10px] text-text-muted">
            JOY88 &copy; {new Date().getFullYear()} | 資料僅供參考，不構成投資建議
          </span>
        </div>
      </footer>
    </div>
  )
}
