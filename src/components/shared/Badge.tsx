type BadgeVariant = 'red' | 'green' | 'yellow' | 'blue' | 'purple' | 'orange'

const variantClasses: Record<BadgeVariant, string> = {
  red: 'bg-up/15 text-up',
  green: 'bg-down/15 text-down',
  yellow: 'bg-yellow/15 text-yellow',
  blue: 'bg-accent/15 text-accent',
  purple: 'bg-purple/15 text-purple',
  orange: 'bg-warning/15 text-warning',
}

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold uppercase ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}
