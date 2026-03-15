interface KpiCardProps {
  label: string
  value: string | number
  subtext?: string
  valueColor?: string
}

export function KpiCard({ label, value, subtext, valueColor }: KpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col hover:bg-card-hover hover:border-accent transition-all">
      <div className="text-sm text-text-muted uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold mb-1 ${valueColor || 'text-accent'}`}>{value}</div>
      {subtext && <div className="text-xs text-text-muted">{subtext}</div>}
    </div>
  )
}

interface KpiGridProps {
  children: React.ReactNode
  columns?: number
}

export function KpiGrid({ children, columns }: KpiGridProps) {
  const gridCols = columns
    ? `grid-cols-${columns}`
    : 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]'
  return (
    <div className={`grid ${gridCols} gap-4 mb-4`}>
      {children}
    </div>
  )
}
