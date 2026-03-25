import { lazy, Suspense } from 'react'
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom'
import { DataProvider } from './contexts/DataContext'
import { Layout } from './components/layout/Layout'

const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })))
const P1HoldingsTracker = lazy(() => import('./pages/P1HoldingsTracker').then(m => ({ default: m.P1HoldingsTracker })))
const P2StrategicDashboard = lazy(() => import('./pages/P2StrategicDashboard').then(m => ({ default: m.P2StrategicDashboard })))
const P3CopyTradingStrategy = lazy(() => import('./pages/P3CopyTradingStrategy').then(m => ({ default: m.P3CopyTradingStrategy })))
const P4EtfHistoryComparison = lazy(() => import('./pages/P4EtfHistoryComparison').then(m => ({ default: m.P4EtfHistoryComparison })))
const P5StrategyAnalysis = lazy(() => import('./pages/P5StrategyAnalysis').then(m => ({ default: m.P5StrategyAnalysis })))
const P7MarketCap0050 = lazy(() => import('./pages/P7MarketCap0050').then(m => ({ default: m.P7MarketCap0050 })))
const P8RiskSignals = lazy(() => import('./pages/P8RiskSignals').then(m => ({ default: m.P8RiskSignals })))
const P9AiQA = lazy(() => import('./pages/P9AiQA').then(m => ({ default: m.P9AiQA })))
const P10NewsDeconstruction = lazy(() => import('./pages/P10NewsDeconstruction').then(m => ({ default: m.P10NewsDeconstruction })))
const P11TrumpSignal = lazy(() => import('./pages/P11TrumpSignal').then(m => ({ default: m.P11TrumpSignal })))
const P12TsmcVolSignal = lazy(() => import('./pages/P12TsmcVolSignal').then(m => ({ default: m.P12TsmcVolSignal })))

const pageFallback = (
  <div className="flex items-center justify-center h-64">
    <div className="text-text-muted text-sm">Loading...</div>
  </div>
)

const router = createHashRouter([
  { path: '/landing', element: <Suspense fallback={pageFallback}><LandingPage /></Suspense> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Suspense fallback={pageFallback}><P2StrategicDashboard /></Suspense> },
      { path: 'risk', element: <Suspense fallback={pageFallback}><P8RiskSignals /></Suspense> },
      { path: 'holdings', element: <Suspense fallback={pageFallback}><P1HoldingsTracker /></Suspense> },
      { path: 'copy-trading', element: <Suspense fallback={pageFallback}><P3CopyTradingStrategy /></Suspense> },
      { path: 'strategy', element: <Suspense fallback={pageFallback}><P5StrategyAnalysis /></Suspense> },
      { path: 'history', element: <Suspense fallback={pageFallback}><P4EtfHistoryComparison /></Suspense> },
      { path: '0050', element: <Suspense fallback={pageFallback}><P7MarketCap0050 /></Suspense> },
      { path: 'ai-qa', element: <Suspense fallback={pageFallback}><P9AiQA /></Suspense> },
      { path: 'news', element: <Suspense fallback={pageFallback}><P10NewsDeconstruction /></Suspense> },
      { path: 'trump', element: <Suspense fallback={pageFallback}><P11TrumpSignal /></Suspense> },
      { path: 'tsmc-vol', element: <Suspense fallback={pageFallback}><P12TsmcVolSignal /></Suspense> },
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
