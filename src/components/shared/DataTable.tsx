import { useState, useMemo } from 'react'

interface Column<T> {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  render?: (item: T, index: number) => React.ReactNode
  sortable?: boolean
  sortValue?: (item: T) => number | string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyText?: string
  emptyColSpan?: number
}

export function DataTable<T>({ columns, data, emptyText = '暫無資料' }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find((c) => c.key === sortKey)
    if (!col) return data
    const getValue = col.sortValue || ((item: T) => (item as Record<string, unknown>)[col.key])
    return [...data].sort((a, b) => {
      const aVal = getValue(a)
      const bVal = getValue(b)
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal ?? '')
      const bStr = String(bVal ?? '')
      return sortAsc ? aStr.localeCompare(bStr, 'zh-TW') : bStr.localeCompare(aStr, 'zh-TW')
    })
  }, [data, sortKey, sortAsc, columns])

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-border">
          {columns.map((col) => (
            <th
              key={col.key}
              className={`py-2 px-3 font-semibold text-text-muted text-xs uppercase tracking-wider ${
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
              } ${col.sortable !== false ? 'cursor-pointer hover:text-accent select-none' : ''}`}
              onClick={() => col.sortable !== false && handleSort(col.key)}
            >
              {col.label}
              {sortKey === col.key && (
                <span className="ml-1">{sortAsc ? '\u25B2' : '\u25BC'}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedData.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="py-6 text-center text-text-muted">
              {emptyText}
            </td>
          </tr>
        ) : (
          sortedData.map((item, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-card-hover/50 transition-colors">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-2 px-3 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.render
                    ? col.render(item, i)
                    : String((item as Record<string, unknown>)[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
