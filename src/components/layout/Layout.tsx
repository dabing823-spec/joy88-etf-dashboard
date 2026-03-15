import { NavLink, Outlet } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: '戰略儀表板' },
  { to: '/risk', label: '風險訊號' },
  { to: '/holdings', label: '00981A 持股追蹤' },
  { to: '/copy-trading', label: '老墨跟單策略' },
  { to: '/strategy', label: '策略分析 & 回測' },
  { to: '/history', label: '歷史回溯' },
  { to: '/0050', label: '0050 / 市值' },
  { to: '/ai-qa', label: 'AI 問答' },
  { to: '/news', label: '新聞解構' },
  { to: '/trump', label: 'Trump Signal' },
]

export function Layout() {
  const { isLoading, error, dashboard } = useData()

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <h1 className="text-base font-bold text-accent whitespace-nowrap">
              JOY88 ETF Dashboard
            </h1>
            {dashboard && (
              <span className="text-xs text-text-muted">
                {dashboard.report_date}
              </span>
            )}
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
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

      <main className="max-w-[1400px] mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-text-muted">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-up">{error}</div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <footer className="border-t border-border py-4 mt-8">
        <div className="max-w-[1400px] mx-auto px-4 text-center text-xs text-text-muted">
          JOY88 ETF Dashboard &copy; {new Date().getFullYear()} | 資料僅供參考，不構成投資建議
        </div>
      </footer>
    </div>
  )
}
