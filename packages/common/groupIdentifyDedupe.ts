const STORAGE_KEY = 'ph_group_identify_sent'

/**
 * Check if a group identify call has already been sent for this context key
 * in the current browser session.
 *
 * Returns false (allowing the call through) if sessionStorage is unavailable.
 */
export function hasGroupContextBeenSent(contextKey: string): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const sent: unknown = JSON.parse(raw)
    if (!Array.isArray(sent)) return false
    return sent.includes(contextKey)
  } catch {
    return false
  }
}

/**
 * Mark a group identify context key as sent for this session.
 * Call this after a successful POST to /telemetry/identify.
 *
 * No-ops silently if sessionStorage is unavailable.
 */
export function markGroupContextSent(contextKey: string): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    const sent: string[] = Array.isArray(parsed) ? parsed : []
    if (!sent.includes(contextKey)) {
      sent.push(contextKey)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sent))
    }
  } catch {
    // sessionStorage unavailable — no-op
  }
}
