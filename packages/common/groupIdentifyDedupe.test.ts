import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { hasGroupContextBeenSent, markGroupContextSent } from './groupIdentifyDedupe'

describe('groupIdentifyDedupe', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('hasGroupContextBeenSent', () => {
    it('returns false for an unseen key', () => {
      expect(hasGroupContextBeenSent('uid|org1|proj1')).toBe(false)
    })

    it('returns true after the key has been marked as sent', () => {
      markGroupContextSent('uid|org1|proj1')
      expect(hasGroupContextBeenSent('uid|org1|proj1')).toBe(true)
    })

    it('returns false for a different key that has not been marked', () => {
      markGroupContextSent('uid|org1|proj1')
      expect(hasGroupContextBeenSent('uid|org2|proj2')).toBe(false)
    })

    it('returns false when sessionStorage contains corrupted JSON', () => {
      sessionStorage.setItem('ph_group_identify_sent', 'not-valid-json')
      expect(hasGroupContextBeenSent('uid|org1|proj1')).toBe(false)
    })

    it('returns false when sessionStorage contains valid JSON that is not an array', () => {
      sessionStorage.setItem('ph_group_identify_sent', '"just a string"')
      expect(hasGroupContextBeenSent('uid|org1|proj1')).toBe(false)
    })

    it('returns false when sessionStorage.getItem throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })
      expect(hasGroupContextBeenSent('uid|org1|proj1')).toBe(false)
    })
  })

  describe('markGroupContextSent', () => {
    it('tracks multiple keys independently', () => {
      markGroupContextSent('uid|org1|proj1')
      markGroupContextSent('uid|org2|proj2')

      expect(hasGroupContextBeenSent('uid|org1|proj1')).toBe(true)
      expect(hasGroupContextBeenSent('uid|org2|proj2')).toBe(true)
    })

    it('does not duplicate keys when marked twice', () => {
      markGroupContextSent('uid|org1|proj1')
      markGroupContextSent('uid|org1|proj1')

      const raw = sessionStorage.getItem('ph_group_identify_sent')
      const sent: string[] = JSON.parse(raw!)
      expect(sent.filter((k) => k === 'uid|org1|proj1')).toHaveLength(1)
    })

    it('does not throw when sessionStorage.setItem throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      expect(() => markGroupContextSent('uid|org1|proj1')).not.toThrow()
    })

    it('does not throw when sessionStorage contains corrupted JSON', () => {
      sessionStorage.setItem('ph_group_identify_sent', '{bad}')
      expect(() => markGroupContextSent('uid|org1|proj1')).not.toThrow()
    })
  })
})
