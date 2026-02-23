import type { CustomProvider } from './customProviders.types'

export function getCustomProviderLimit(planId: string | undefined): number {
  if (planId === 'free') return 3
  if (planId === 'pro') return 10
  return Infinity
}

/** Next plan to upgrade to for more custom providers: Free → Pro, Pro → Team */
export function getNextPlanForCustomProviders(planId: string | undefined): 'Pro' | 'Team' | null {
  if (planId === 'free') return 'Pro'
  if (planId === 'pro') return 'Team'
  return null
}

export const CUSTOM_PROVIDER_TYPE_OPTIONS = [
  { name: 'OIDC', value: 'oidc', icon: null },
  { name: 'OAuth2', value: 'oauth2', icon: null },
]

export const CUSTOM_PROVIDER_ENABLED_OPTIONS = [
  { name: 'Enabled', value: 'true', icon: null },
  { name: 'Disabled', value: 'false', icon: null },
]

export function filterCustomProviders({
  providers,
  searchString,
  providerTypes,
  enabledStatuses,
}: {
  providers: CustomProvider[]
  searchString: string
  providerTypes: string[]
  enabledStatuses: string[]
}) {
  return providers.filter((provider) => {
    const matchesSearch =
      searchString === '' ||
      provider.name.toLowerCase().includes(searchString.toLowerCase()) ||
      provider.identifier.toLowerCase().includes(searchString.toLowerCase())

    const matchesType = providerTypes.length === 0 || providerTypes.includes(provider.provider_type)

    const matchesEnabled =
      enabledStatuses.length === 0 || enabledStatuses.includes(provider.enabled ? 'true' : 'false')

    return matchesSearch && matchesType && matchesEnabled
  })
}

// Mock data for development
export const MOCK_CUSTOM_PROVIDERS: CustomProvider[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    provider_type: 'oidc',
    identifier: 'custom:company-sso',
    name: 'Company SSO',
    client_id: 'client_abc123',
    scopes: 'read:user',
    pkce_enabled: true,
    enabled: true,
    email_optional: false,
    issuer: 'https://accounts.company.com',
    discovery_url: 'https://accounts.company.com/.well-known/openid-configuration',
    skip_nonce_check: false,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    provider_type: 'oauth2',
    identifier: 'custom:custom-auth',
    name: 'Custom Auth Provider',
    client_id: 'client_xyz789',
    scopes: 'email, profile, read:user',
    pkce_enabled: true,
    enabled: true,
    email_optional: false,
    authorization_url: 'https://auth.example.com/oauth/authorize',
    token_url: 'https://auth.example.com/oauth/token',
    userinfo_url: 'https://auth.example.com/oauth/userinfo',
    created_at: '2024-02-01T14:20:00Z',
    updated_at: '2024-02-01T14:20:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    provider_type: 'oidc',
    identifier: 'custom:partner-login',
    name: 'Partner Login',
    client_id: 'client_partner456',
    scopes: 'read:user, user:email',
    pkce_enabled: false,
    enabled: false,
    email_optional: true,
    issuer: 'https://partner.example.com',
    skip_nonce_check: false,
    created_at: '2024-01-20T08:15:00Z',
    updated_at: '2024-01-22T16:45:00Z',
  },
]
