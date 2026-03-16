export const ETF_LIST = ['00981A', '00980A', '00982A', '00991A', '00993A'] as const

export const ETF_NAMES: Record<string, string> = {
  '00981A': '統一台股增長',
  '00980A': '野村臺灣智慧優選',
  '00982A': '群益台灣精選強棒',
  '00991A': '復華台灣未來50',
  '00993A': '安聯台灣',
}

export const ETF_SHORT_NAMES: Record<string, string> = {
  '00981A': '統一增長',
  '00980A': '野村優選',
  '00982A': '群益強棒',
  '00991A': '復華未來50',
  '00993A': '安聯台灣',
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
