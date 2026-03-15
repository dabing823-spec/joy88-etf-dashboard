export function formatPrice(v: number | string | null | undefined): string {
  if (v == null || v === '-') return '-'
  return Number(v).toFixed(2)
}

export function formatChangePct(v: number | string | null | undefined): { text: string; color: string } {
  if (v == null || v === '-') return { text: '-', color: 'text-text-muted' }
  const n = Number(v)
  const color = n > 0 ? 'text-up' : n < 0 ? 'text-down' : 'text-text-muted'
  const text = `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
  return { text, color }
}

export function formatVolume(v: number | string | null | undefined): string {
  if (!v || v === '-') return '-'
  const n = Number(v)
  if (n >= 1e8) return (n / 1e8).toFixed(1) + ' 億'
  if (n >= 1e4) return (n / 1e4).toFixed(0) + ' 萬'
  return n.toLocaleString()
}

export function formatTurnover(v: number | string | null | undefined): string {
  if (!v || v === '-') return '-'
  const n = Number(v)
  if (n >= 1e8) return (n / 1e8).toFixed(2) + ' 億'
  if (n >= 1e4) return (n / 1e4).toFixed(0) + ' 萬'
  return n.toLocaleString()
}
