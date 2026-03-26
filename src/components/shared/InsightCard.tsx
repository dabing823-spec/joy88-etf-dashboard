interface InsightCardProps {
  title: string
  children: React.ReactNode
  borderColor?: string
}

export function InsightCard({ title, children, borderColor = 'border-l-accent' }: InsightCardProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 border-l-4 ${borderColor} hover:bg-card-hover transition-colors card-lift`}>
      <div className="text-sm font-bold text-text-primary mb-2">{title}</div>
      <div className="text-sm text-text-muted leading-relaxed">{children}</div>
    </div>
  )
}
