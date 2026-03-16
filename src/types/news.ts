export interface NewsLayer1 {
  event: string
  data: string
  market_reaction: string
  timeline: string
}

export interface NewsLayer2 {
  beneficiaries: string[]
  victims: string[]
  pricing_status: string
  real_motive: string
  market_blind_spots: string
}

export interface NewsLayer3 {
  position_impact: string
  expected_value: string
  timing: string
  risk_assessment: string
  action_plan: string
}

export interface NewsAnalysisItem {
  id: string
  date: string
  headline: string
  category: string
  category_color: string
  source?: string
  link?: string
  layer1: NewsLayer1
  layer2: NewsLayer2
  layer3: NewsLayer3
  generated_at: string
}

export interface NewsAnalysisData {
  version: number
  updated_at: string
  notebook: string
  news_analyses: NewsAnalysisItem[]
}

export interface AiResearchAnalysis {
  etf_code: string
  date: string
  changes_summary: string
  changes_detail: {
    new: Array<{ code: string; name: string; weight: number; weight_chg: number }>
    added: Array<{ code: string; name: string; weight: number; weight_chg: number }>
    reduced: Array<{ code: string; name: string; weight: number; weight_chg: number }>
    removed: Array<{ code: string; name: string; weight: number; weight_chg: number }>
  }
  institutional_view: { summary: string; key_points: string[] }
  trader_view: { summary: string; key_points: string[] }
}

export interface AiResearchData {
  version: number
  updated_at: string
  notebooks: Record<string, string>
  analyses: Record<string, AiResearchAnalysis>
}
