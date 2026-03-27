type IntroVariant = 'default' | 'green' | 'red' | 'orange' | 'accent'

const borderColors: Record<IntroVariant, string> = {
  default: 'border-l-accent',
  green: 'border-l-down',
  red: 'border-l-up',
  orange: 'border-l-warning',
  accent: 'border-l-accent',
}

interface IntroBoxProps {
  variant?: IntroVariant
  children: React.ReactNode
  className?: string
}

export function IntroBox({ variant = 'default', children, className = '' }: IntroBoxProps) {
  return (
    <div className={`mb-4 px-4 py-3 bg-accent/5 rounded-lg border-l-[3px] ${borderColors[variant]} text-sm text-text-muted leading-relaxed ${className}`}>
      {children}
    </div>
  )
}
