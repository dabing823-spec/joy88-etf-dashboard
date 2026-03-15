interface FilterButtonsProps<T extends string> {
  options: Array<{ value: T; label: string }>
  active: T
  onChange: (value: T) => void
}

export function FilterButtons<T extends string>({ options, active, onChange }: FilterButtonsProps<T>) {
  return (
    <div className="flex gap-2 flex-wrap mb-3">
      {options.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            active === value
              ? 'bg-accent text-white border-accent'
              : 'bg-card text-text-primary border-border hover:bg-card-hover hover:border-accent'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
