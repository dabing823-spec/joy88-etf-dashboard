import { NavLink, Outlet } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import { BASE_URL } from '../../lib/constants'

const NAV_ITEMS = [
  { to: '/dashboard', label: '戰略儀表板' },
  { to: '/risk', label: '風險訊號' },
  { to: '/holdings', label: '00981A 追蹤' },
  { to: '/copy-trading', label: '跟單策略' },
  { to: '/strategy', label: '策略回測' },
  { to: '/history', label: '歷史回溯' },
  { to: '/0050', label: '0050' },
  { to: '/ai-qa', label: 'AI' },
  { to: '/news', label: '新聞' },
  { to: '/trump', label: 'Trump' },
]

export function Layout() {
  const { isLoading, error, dashboard } = useData()

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4">
          {/* Brand row */}
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
            </div>
          </div>
          {/* Nav row */}
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
