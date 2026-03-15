export interface DateRecord {
  date: string
  holdings: Array<{
    code: string
    name: string
    weight: number
    weight_chg: number
  }>
  cash_pct: number
  n_holdings: number
  changes: {
    new: Array<{ code: string; name: string; weight: number }>
    removed: Array<{ code: string; name: string; prev_weight: number }>
    added: Array<{ code: string; name: string; weight: number; weight_chg: number }>
    reduced: Array<{ code: string; name: string; weight: number; weight_chg: number }>
  }
}

export interface EtfPageData {
  dates: string[]
  n_dates: number
  date_records: Record<string, DateRecord>
  cash_series: Array<{ date: string; cash_pct: number; n_holdings: number }>
}

export type EtfPagesData = Record<string, EtfPageData>
