import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Format a number as currency. `currency` is an ISO 4217 code (USD, EUR, CNY…)
// and defaults to USD so call sites that haven't been migrated yet still work.
// For chapter-aware formatting, prefer the useFormatCurrency() hook which
// reads the current chapter's preferred currency from context.
export function formatCurrency(amount, currency = 'USD') {
  // Locale driven by the currency — en-US for USD, de-DE for EUR, etc.
  // The Intl API handles symbol placement and separators correctly.
  const locale = currency === 'USD' ? 'en-US'
               : currency === 'EUR' ? 'de-DE'
               : currency === 'GBP' ? 'en-GB'
               : currency === 'CNY' ? 'zh-CN'
               : currency === 'JPY' ? 'ja-JP'
               : currency === 'AUD' ? 'en-AU'
               : currency === 'CAD' ? 'en-CA'
               : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateWithDay(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
