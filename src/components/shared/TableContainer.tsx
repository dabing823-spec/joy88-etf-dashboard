interface TableContainerProps {
  title?: string
  titleColor?: string
  maxHeight?: string
  children: React.ReactNode
  className?: string
}

export function TableContainer({ title, titleColor, maxHeight, children, className = '' }: TableContainerProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 mb-4 overflow-hidden ${className}`}>
      {title && (
        <div className={`text-base font-semibold mb-3 ${titleColor || 'text-text-primary'}`}>
          {title}
        </div>
      )}
      <div className="overflow-x-auto" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
        {children}
      </div>
    </div>
  )
}
