export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '-'
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '-'
  return value.toLocaleString('zh-TW', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`
  return dateStr
}

export function formatFullDate(dateStr: string): string {
  if (!dateStr) return '-'
  return dateStr
}

export function chgColor(value: number): string {
  if (value > 0) return 'text-red-400'
  if (value < 0) return 'text-green-400'
  return 'text-gray-400'
}

export function chgArrow(value: number): string {
  if (value > 0) return '\u25B2'
  if (value < 0) return '\u25BC'
  return '-'
}

export function riskLevelColor(level: string): string {
  switch (level) {
    case 'red': return 'text-red-400'
    case 'yellow': return 'text-yellow-400'
    case 'green': return 'text-green-400'
    default: return 'text-gray-400'
  }
}

export function riskLevelBg(level: string): string {
  switch (level) {
    case 'red': return 'bg-red-500/20 border-red-500/30'
    case 'yellow': return 'bg-yellow-500/20 border-yellow-500/30'
    case 'green': return 'bg-green-500/20 border-green-500/30'
    default: return 'bg-gray-500/20 border-gray-500/30'
  }
}
