import { describe, it, expect } from 'vitest'
import { formatPct, formatNumber, formatDate, chgColor, chgArrow, riskLevelColor, riskLevelBg } from '../lib/formatters'
import { formatPrice, formatChangePct, formatVolume, formatTurnover } from '../lib/p7Formatters'

describe('formatters', () => {
  describe('formatPct', () => {
    it('formats positive values with + prefix', () => {
      expect(formatPct(5.123)).toBe('+5.1%')
    })
    it('formats negative values', () => {
      expect(formatPct(-3.456)).toBe('-3.5%')
    })
    it('formats zero with + prefix', () => {
      expect(formatPct(0)).toBe('+0.0%')
    })
    it('returns - for null/undefined', () => {
      expect(formatPct(null)).toBe('-')
      expect(formatPct(undefined)).toBe('-')
    })
    it('respects decimals parameter', () => {
      expect(formatPct(5.123, 2)).toBe('+5.12%')
    })
  })

  describe('formatNumber', () => {
    it('formats with locale', () => {
      expect(formatNumber(1234.5)).toMatch(/1.*234\.50/)
    })
    it('returns - for null', () => {
      expect(formatNumber(null)).toBe('-')
    })
  })

  describe('formatDate', () => {
    it('extracts MM/DD from YYYY-MM-DD', () => {
      expect(formatDate('2026-03-28')).toBe('03/28')
    })
    it('returns - for empty string', () => {
      expect(formatDate('')).toBe('-')
    })
    it('returns original for non-standard format', () => {
      expect(formatDate('03/28')).toBe('03/28')
    })
  })

  describe('chgColor', () => {
    it('returns text-up for positive', () => {
      expect(chgColor(1)).toBe('text-up')
    })
    it('returns text-down for negative', () => {
      expect(chgColor(-1)).toBe('text-down')
    })
    it('returns text-text-muted for zero', () => {
      expect(chgColor(0)).toBe('text-text-muted')
    })
  })

  describe('chgArrow', () => {
    it('returns up arrow for positive', () => {
      expect(chgArrow(1)).toBe('▲')
    })
    it('returns down arrow for negative', () => {
      expect(chgArrow(-1)).toBe('▼')
    })
    it('returns dash for zero', () => {
      expect(chgArrow(0)).toBe('-')
    })
  })

  describe('riskLevelColor', () => {
    it('maps risk levels to CSS classes', () => {
      expect(riskLevelColor('red')).toBe('text-danger')
      expect(riskLevelColor('yellow')).toBe('text-warning')
      expect(riskLevelColor('green')).toBe('text-down')
      expect(riskLevelColor('unknown')).toBe('text-text-muted')
    })
  })

  describe('riskLevelBg', () => {
    it('maps risk levels to bg classes', () => {
      expect(riskLevelBg('red')).toContain('bg-danger')
      expect(riskLevelBg('yellow')).toContain('bg-warning')
      expect(riskLevelBg('green')).toContain('bg-down')
    })
  })
})

describe('p7Formatters', () => {
  describe('formatPrice', () => {
    it('formats number to 2 decimals', () => {
      expect(formatPrice(123.456)).toBe('123.46')
    })
    it('handles string input', () => {
      expect(formatPrice('45.1')).toBe('45.10')
    })
    it('returns - for null/undefined/-', () => {
      expect(formatPrice(null)).toBe('-')
      expect(formatPrice(undefined)).toBe('-')
      expect(formatPrice('-')).toBe('-')
    })
  })

  describe('formatChangePct', () => {
    it('formats positive with + and text-up', () => {
      const result = formatChangePct(2.5)
      expect(result.text).toBe('+2.50%')
      expect(result.color).toBe('text-up')
    })
    it('formats negative with text-down', () => {
      const result = formatChangePct(-1.23)
      expect(result.text).toBe('-1.23%')
      expect(result.color).toBe('text-down')
    })
    it('returns - for null', () => {
      expect(formatChangePct(null).text).toBe('-')
    })
  })

  describe('formatVolume', () => {
    it('formats billions as 億', () => {
      expect(formatVolume(1.5e8)).toBe('1.5 億')
    })
    it('formats ten-thousands as 萬', () => {
      expect(formatVolume(50000)).toBe('5 萬')
    })
    it('formats small numbers with locale', () => {
      expect(formatVolume(999)).toMatch(/999/)
    })
    it('returns - for falsy', () => {
      expect(formatVolume(0)).toBe('-')
      expect(formatVolume(null)).toBe('-')
    })
  })

  describe('formatTurnover', () => {
    it('formats billions as 億 with 2 decimals', () => {
      expect(formatTurnover(1.5e8)).toBe('1.50 億')
    })
    it('formats ten-thousands as 萬', () => {
      expect(formatTurnover(50000)).toBe('5 萬')
    })
  })
})
