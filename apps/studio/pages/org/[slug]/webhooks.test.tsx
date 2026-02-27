import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('components/interfaces/Platform/Webhooks', () => ({
  PlatformWebhooksPage: ({ scope }: { scope: string }) => <div>scope:{scope}</div>,
}))

import OrgWebhooksSettings from './webhooks'

describe('Org webhooks page', () => {
  it('renders platform webhooks page with organization scope', () => {
    render(<OrgWebhooksSettings />)
    expect(screen.getByText('scope:organization')).toBeInTheDocument()
  })
})
