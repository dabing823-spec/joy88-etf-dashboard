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

// ── Shared color palette (hex values for Chart.js / inline styles) ──
export const palette = {
  red: '#ff4757',
  orange: '#ffa502',
  green: '#00c48c',
  blue: '#4f8ef7',
  purple: '#a855f7',
  cyan: '#22d3ee',
  accent: '#e09f3e',
  up: '#e54545',
  down: '#22c55e',
  warning: '#f59e0b',
  textMuted: '#7d829a',
  text: '#e8eaef',
  grid: 'rgba(30, 34, 53, 0.5)',
} as const

export const RISK_LEVEL_COLORS: Record<string, string> = {
  green: palette.green,
  yellow: palette.orange,
  red: palette.red,
}

export const LEVEL_MAP: Record<string, { label: string; color: string }> = {
  red: { label: '🔴 高度警戒', color: palette.red },
  high: { label: '🔴 高度警戒', color: palette.red },
  yellow: { label: '🟡 中度警戒', color: palette.orange },
  medium: { label: '🟡 中度警戒', color: palette.orange },
  green: { label: '🟢 正常', color: palette.green },
  low: { label: '🟢 正常', color: palette.green },
}

export const MODE_COLORS: Record<string, string> = {
  aggressive: palette.red,
  growth: palette.orange,
  balanced: palette.blue,
  defensive: palette.green,
}

export const ETF_COLORS: Record<string, string> = {
  '00981A': palette.blue,
  '00980A': palette.orange,
  '00982A': palette.purple,
  '00991A': palette.green,
  '00993A': palette.cyan,
}

export const STOCK_COLORS = [
  palette.blue, palette.red, palette.green, palette.orange, palette.purple,
  palette.cyan, '#ffc312', '#ff6b81', '#7bed9f', '#70a1ff',
  '#eccc68', '#ff6348', '#2ed573', '#1e90ff', '#ff4500',
  '#dfe6e9', '#6c5ce7', '#fdcb6e', '#e17055', '#00b894',
] as const

export const VOL_TIER_COLORS: Record<string, string> = {
  '低波': palette.green,
  '中低波': palette.blue,
  '中波': palette.orange,
  '中高波': '#ff6b35',
  '高波': palette.red,
}

export const IMPACT_COLORS: Record<string, string> = {
  '高': palette.red,
  '中': palette.orange,
  '低': palette.blue,
}

export const SIGNAL_COLORS: Record<string, string> = {
  '新增': palette.up,
  '加碼': palette.accent,
  '減碼': palette.warning,
  '退出': palette.down,
}

export const BASE_URL = import.meta.env.BASE_URL
