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

export function formatUpdateTime(isoString: string): string {
  const d = new Date(isoString)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

export function chgColor(value: number): string {
  if (value > 0) return 'text-up'
  if (value < 0) return 'text-down'
  return 'text-text-muted'
}

export function chgArrow(value: number): string {
  if (value > 0) return '\u25B2'
  if (value < 0) return '\u25BC'
  return '-'
}

export function riskLevelColor(level: string): string {
  switch (level) {
    case 'red': return 'text-danger'
    case 'yellow': return 'text-warning'
    case 'green': return 'text-down'
    default: return 'text-text-muted'
  }
}

export function riskLevelBg(level: string): string {
  switch (level) {
    case 'red': return 'bg-danger/20 border-danger/30'
    case 'yellow': return 'bg-warning/20 border-warning/30'
    case 'green': return 'bg-down/20 border-down/30'
    default: return 'bg-text-muted/20 border-text-muted/30'
  }
}
