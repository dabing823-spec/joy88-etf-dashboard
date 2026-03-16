import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom'
import { DataProvider } from './contexts/DataContext'
import { Layout } from './components/layout/Layout'
import { LandingPage } from './pages/LandingPage'
import { P1HoldingsTracker } from './pages/P1HoldingsTracker'
import { P2StrategicDashboard } from './pages/P2StrategicDashboard'
import { P3CopyTradingStrategy } from './pages/P3CopyTradingStrategy'
import { P4EtfHistoryComparison } from './pages/P4EtfHistoryComparison'
import { P5StrategyAnalysis } from './pages/P5StrategyAnalysis'
import { P7MarketCap0050 } from './pages/P7MarketCap0050'
import { P8RiskSignals } from './pages/P8RiskSignals'
import { P9AiQA } from './pages/P9AiQA'
import { P10NewsDeconstruction } from './pages/P10NewsDeconstruction'
import { P11TrumpSignal } from './pages/P11TrumpSignal'
import { P12TsmcVolSignal } from './pages/P12TsmcVolSignal'

const router = createHashRouter([
  { path: '/landing', element: <LandingPage /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <P2StrategicDashboard /> },
      { path: 'risk', element: <P8RiskSignals /> },
      { path: 'holdings', element: <P1HoldingsTracker /> },
      { path: 'copy-trading', element: <P3CopyTradingStrategy /> },
      { path: 'strategy', element: <P5StrategyAnalysis /> },
      { path: 'history', element: <P4EtfHistoryComparison /> },
      { path: '0050', element: <P7MarketCap0050 /> },
      { path: 'ai-qa', element: <P9AiQA /> },
      { path: 'news', element: <P10NewsDeconstruction /> },
      { path: 'trump', element: <P11TrumpSignal /> },
      { path: 'tsmc-vol', element: <P12TsmcVolSignal /> },
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
