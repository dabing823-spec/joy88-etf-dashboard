export interface CashMode {
  mode: string
  mode_desc: string
  trend: string
  cash_now: number
  cash_5ma: number
  cash_20ma: number
  has_futures: boolean
  futures_signal: string
  n_holdings: number
  cash_series: number[]
  cash_percentile?: number
  percentile_label?: string
  flow_adjusted_mode?: string
  avg_active_delta?: number
  scenario?: {
    code: string
    label: string
    reason: string
    action: string
  }
  fund_health?: {
    aum: number | null
    aum_growth_20d: number | null
    flow_streak: number
    large_flow: boolean
    large_flow_label: string
  }
}

export interface Holding {
  code: string
  name: string
  weight: number
  weight_chg: number
  prev_weight: number
  rank: number
  prev_rank: number
  rank_chg: number
}

export interface ConvictionItem {
  code: string
  name: string
  score: number
  days_held: number
  avg_weight: number
  weight_trend: string
}

export interface ConsensusItem {
  code: string
  name: string
  etf_count: number
  etfs: string[]
  total_weight: number
  avg_weight: number
}

export interface LaomoSignal {
  date: string
  etf: string
  type: string
  code: string
  name: string
  weight: number
  weight_chg: number
  reason: string
  confidence?: string | number
  hold_suggestion?: string
}

export interface DailyChange {
  date: string
  new: Array<{ code: string; name: string; weight: number }>
  exited: Array<{ code: string; name: string; prev_weight?: number }>
  added: Array<{ code: string; name: string; weight: number; weight_chg: number }>
  reduced: Array<{ code: string; name: string; weight: number; weight_chg: number }>
  cash_pct?: number
  nav?: number
  fund_value?: number
}

export interface CashSeriesItem {
  date: string
  cash_pct: number
  cash_5ma?: number
  cash_20ma?: number
  stock_pct?: number
  n_holdings: number
  taiex?: number
  tpex?: number
  etf_id?: string
  units?: number
  units_change?: number
  nav?: number
  aum?: number | null
}

export interface StockSeriesItem {
  code: string
  name: string
  series: Array<{ date: string; weight: number }>
}

export interface UpdateStatus {
  pipeline_completed_at: string
  report_date: string
  status: string
}

export interface DashboardData {
  report_date: string
  dates: string[]
  cash_mode: CashMode
  cash_series: CashSeriesItem[]
  latest_holdings: Record<string, { date: string; cash_pct: number; n_stocks: number; stocks: Holding[] } | Holding[]>
  weight_history: Record<string, Array<{ date: string; weight: number }>>
  conviction: ConvictionItem[]
  consensus: ConsensusItem[]
  daily_changes: Record<string, DailyChange[]>
  laomo_signals: LaomoSignal[]
  top20_stocks: Array<{ code: string; name: string; total_weight: number }>
  stock_series: StockSeriesItem[]
  big_add_counts: Array<{ date: string; count: number }>
}
