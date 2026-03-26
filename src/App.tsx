import { lazy, Suspense } from 'react'
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom'
import { DataProvider } from './contexts/DataContext'
import { Layout } from './components/layout/Layout'
import { ErrorBoundary } from './components/shared'

function lazyRetry(load: () => Promise<{ [key: string]: any }>, name: string) {
  return lazy(() =>
    load()
      .then(m => ({ default: m[name] }))
      .catch(() => {
        // Chunk load failed (stale deploy, network error) — force reload once
        const key = `chunk-retry-${name}`
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1')
          window.location.reload()
        }
        return { default: () => null }
      })
  )
}

const LandingPage = lazyRetry(() => import('./pages/LandingPage'), 'LandingPage')
const P1HoldingsTracker = lazyRetry(() => import('./pages/P1HoldingsTracker'), 'P1HoldingsTracker')
const P2StrategicDashboard = lazyRetry(() => import('./pages/P2StrategicDashboard'), 'P2StrategicDashboard')
const P3CopyTradingStrategy = lazyRetry(() => import('./pages/P3CopyTradingStrategy'), 'P3CopyTradingStrategy')
const P4EtfHistoryComparison = lazyRetry(() => import('./pages/P4EtfHistoryComparison'), 'P4EtfHistoryComparison')
const P5StrategyAnalysis = lazyRetry(() => import('./pages/P5StrategyAnalysis'), 'P5StrategyAnalysis')
const P7MarketCap0050 = lazyRetry(() => import('./pages/P7MarketCap0050'), 'P7MarketCap0050')
const P8RiskSignals = lazyRetry(() => import('./pages/P8RiskSignals'), 'P8RiskSignals')
const P9AiQA = lazyRetry(() => import('./pages/P9AiQA'), 'P9AiQA')
const P10NewsDeconstruction = lazyRetry(() => import('./pages/P10NewsDeconstruction'), 'P10NewsDeconstruction')
function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">{title}</h1>
      <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
        <div className="text-2xl font-bold text-text-muted mb-2">後續更新</div>
        <div className="text-sm text-text-muted">{desc}</div>
      </div>
    </div>
  )
}

const pageFallback = (
  <div className="flex items-center justify-center h-64">
    <div className="text-text-muted text-sm">Loading...</div>
  </div>
)

function Page({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={pageFallback}>{children}</Suspense>
    </ErrorBoundary>
  )
}

const router = createHashRouter([
  { path: '/landing', element: <Page><LandingPage /></Page> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Page><P2StrategicDashboard /></Page> },
      { path: 'risk', element: <Page><P8RiskSignals /></Page> },
      { path: 'holdings', element: <Page><P1HoldingsTracker /></Page> },
      { path: 'copy-trading', element: <Page><P3CopyTradingStrategy /></Page> },
      { path: 'strategy', element: <Page><P5StrategyAnalysis /></Page> },
      { path: 'history', element: <Page><P4EtfHistoryComparison /></Page> },
      { path: '0050', element: <Page><P7MarketCap0050 /></Page> },
      { path: 'ai-qa', element: <Page><P9AiQA /></Page> },
      { path: 'news', element: <Page><P10NewsDeconstruction /></Page> },
      { path: 'trump', element: <ComingSoon title="Trump Signal — 川普密碼" desc="策略整合中，預計近期重新上線" /> },
      { path: 'tsmc-vol', element: <ComingSoon title="TSMC Vol Signal" desc="波動率計算已移植至 tsmc-atr-v2，待 API 整合後重新上線" /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
])

export function App() {
  return (
    <DataProvider>
      <RouterProvider router={router} />
    </DataProvider>
  )
}
