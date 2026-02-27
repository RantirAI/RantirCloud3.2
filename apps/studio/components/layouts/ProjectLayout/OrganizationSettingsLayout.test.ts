import { describe, expect, it } from 'vitest'

import {
  generateOrganizationSettingsMenuItems,
  generateOrganizationSettingsSections,
  normalizeOrganizationSettingsPath,
} from './OrganizationSettingsLayout'

describe('generateOrganizationSettingsMenuItems', () => {
  it('includes platform webhooks entry for organization settings nav', () => {
    const items = generateOrganizationSettingsMenuItems({
      slug: 'my-org',
      showSecuritySettings: true,
      showSsoSettings: true,
      showLegalDocuments: true,
    })

    expect(items.some((item) => item.label === 'Platform Webhooks')).toBe(true)
    expect(items.some((item) => item.href === '/org/my-org/webhooks')).toBe(true)
  })
})

describe('OrganizationSettingsLayout helpers', () => {
  it('returns expected organization settings links', () => {
    const [section] = generateOrganizationSettingsSections({
      slug: 'my-org',
      currentPath: '/org/my-org/general',
      showSecuritySettings: true,
      showSsoSettings: true,
      showLegalDocuments: true,
    })

    expect(section.heading).toBe('Organization Settings')
    expect(section.links.map((item) => item.label)).toEqual([
      'General',
      'Security',
      'OAuth Apps',
      'SSO',
      'Platform Webhooks',
      'Audit Logs',
      'Legal Documents',
    ])
    expect(section.links.find((item) => item.label === 'General')?.isActive).toBe(true)
  })

  it('hides feature-flagged items when flags are disabled', () => {
    const [section] = generateOrganizationSettingsSections({
      slug: 'my-org',
      currentPath: '/org/my-org/general',
      showSecuritySettings: false,
      showSsoSettings: false,
      showLegalDocuments: false,
    })

    expect(section.links.map((item) => item.label)).toEqual([
      'General',
      'OAuth Apps',
      'Platform Webhooks',
      'Audit Logs',
    ])
  })

  it('normalizes hash paths for active state checks', () => {
    const currentPath = normalizeOrganizationSettingsPath('/org/my-org/security#sso')
    const [section] = generateOrganizationSettingsSections({
      slug: 'my-org',
      currentPath,
      showSecuritySettings: true,
      showSsoSettings: true,
      showLegalDocuments: true,
    })

    expect(section.links.find((item) => item.label === 'Security')?.isActive).toBe(true)
  })
})
