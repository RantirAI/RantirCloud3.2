import { formatDuration as formatDurationLong } from '../../QueryPerformance/QueryPerformance.utils'

export const formatDuration = (ms: number) => {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  return formatDurationLong(ms)
}

export const getQueryType = (query: string | undefined | null): string | null => {
  if (!query) return null

  // Remove leading whitespace and get the first word
  const trimmed = query.trim()
  const firstWord = trimmed.split(/\s+/)[0]?.toUpperCase()

  // Common SQL command types
  const sqlTypes = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE', 'WITH']

  // Check if it's a known SQL type
  if (firstWord && sqlTypes.includes(firstWord)) {
    return firstWord
  }

  // Handle CTEs (WITH ... SELECT)
  if (trimmed.toUpperCase().startsWith('WITH')) {
    // Find the first SELECT, INSERT, UPDATE, DELETE after WITH
    const match = trimmed.match(/WITH\s+.*?\s+(SELECT|INSERT|UPDATE|DELETE)/i)
    if (match && match[1]) {
      return match[1].toUpperCase()
    }
    return 'WITH'
  }

  return null
}
