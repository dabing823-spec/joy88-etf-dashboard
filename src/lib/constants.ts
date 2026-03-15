export const ETF_LIST = ['00981A', '00980A', '00982A', '00991A', '00993A'] as const

export const ETF_NAMES: Record<string, string> = {
  '00981A': '野村台灣創新科技50',
  '00980A': '野村台灣趨勢動能50',
  '00982A': '野村台灣精選50',
  '00991A': '永豐台灣智能車供應鏈',
  '00993A': '永豐台灣半導體',
}

export const ETF_SHORT_NAMES: Record<string, string> = {
  '00981A': '創新科技50',
  '00980A': '趨勢動能50',
  '00982A': '精選50',
  '00991A': '智能車',
  '00993A': '半導體',
}

export const RISK_LEVEL_COLORS: Record<string, string> = {
  green: '#00c48c',
  yellow: '#ffa502',
  red: '#ff4757',
}

export const MODE_COLORS: Record<string, string> = {
  aggressive: '#ff4757',
  growth: '#ffa502',
  balanced: '#4f8ef7',
  defensive: '#00c48c',
}

export const BASE_URL = import.meta.env.BASE_URL
