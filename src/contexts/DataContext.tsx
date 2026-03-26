import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { DashboardData, UpdateStatus, StrategyData, EtfPagesData, NewsAnalysisData, AiResearchData, TsmcVolSignalData, AdvisorData } from '../types'
import { BASE_URL } from '../lib/constants'

interface MacroStatus {
  macro_updated_at: string
  status: string
}

interface DataState {
  dashboard: DashboardData | null
  updateStatus: UpdateStatus | null
  macroStatus: MacroStatus | null
  strategy: StrategyData | null
  etfPages: EtfPagesData | null
  newsAnalysis: NewsAnalysisData | null
  aiResearch: AiResearchData | null
  tsmcVolSignal: TsmcVolSignalData | null
  advisor: AdvisorData | null
  indicesHistory: Record<string, Array<{ date: string; close: number; open?: number; high?: number; low?: number }>> | null
  isLoading: boolean
  error: string | null
}

const DataContext = createContext<DataState>({
  dashboard: null,
  updateStatus: null,
  macroStatus: null,
  strategy: null,
  etfPages: null,
  newsAnalysis: null,
  aiResearch: null,
  tsmcVolSignal: null,
  advisor: null,
  indicesHistory: null,
  isLoading: true,
  error: null,
})

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${BASE_URL}data/${path}?t=${Date.now()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
  return res.json()
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({
    dashboard: null,
    updateStatus: null,
    macroStatus: null,
    strategy: null,
    etfPages: null,
    newsAnalysis: null,
    aiResearch: null,
    tsmcVolSignal: null,
    advisor: null,
    indicesHistory: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    async function loadData() {
      try {
        const [dashboard, etfPages] = await Promise.all([
          fetchJson<DashboardData>('dashboard.json'),
          fetchJson<EtfPagesData>('etf_pages.json'),
        ])

        setState((prev) => ({ ...prev, dashboard, etfPages, isLoading: false }))

        const [strategy, aiResearch, newsAnalysis, updateStatus, macroStatus, tsmcVolSignal, advisor, indicesHistory] = await Promise.allSettled([
          fetchJson<StrategyData>('strategy.json'),
          fetchJson<AiResearchData>('ai_research.json'),
          fetchJson<NewsAnalysisData>('news_analysis.json'),
          fetchJson<UpdateStatus>('update_status.json'),
          fetchJson<MacroStatus>('macro_status.json'),
          fetchJson<TsmcVolSignalData>('tsmc_vol_signal.json'),
          fetchJson<AdvisorData>('advisor.json'),
          fetchJson<Record<string, any[]>>('indices_history.json'),
        ])

        setState((prev) => ({
          ...prev,
          strategy: strategy.status === 'fulfilled' ? strategy.value : null,
          aiResearch: aiResearch.status === 'fulfilled' ? aiResearch.value : null,
          newsAnalysis: newsAnalysis.status === 'fulfilled' ? newsAnalysis.value : null,
          updateStatus: updateStatus.status === 'fulfilled' ? updateStatus.value : null,
          macroStatus: macroStatus.status === 'fulfilled' ? macroStatus.value : null,
          tsmcVolSignal: tsmcVolSignal.status === 'fulfilled' ? tsmcVolSignal.value : null,
          advisor: advisor.status === 'fulfilled' ? advisor.value : null,
          indicesHistory: indicesHistory.status === 'fulfilled' ? indicesHistory.value : null,
        }))
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }))
      }
    }
    loadData()
  }, [])

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
