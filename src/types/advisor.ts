export interface ActionItem {
  priority: number
  action: string
  reasoning: string
  framework: string
}

export interface DataSourceInfo {
  date: string | null
  fresh: boolean
}

export interface Advisory {
  date: string
  generated_at: string
  market_phase: string
  overall_signal: '攻擊' | '防守' | '觀望'
  data_completeness: number
  action_items: ActionItem[]
  market_summary: string
  risk_assessment: string
  telegram_short: string
  data_sources: Record<string, DataSourceInfo>
  data_gaps: string[]
  outcome: string | null
}

export interface AdvisorData {
  advisories: Advisory[]
}
