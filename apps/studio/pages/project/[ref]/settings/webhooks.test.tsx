import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('components/interfaces/Platform/Webhooks', () => ({
  PlatformWebhooksPage: ({ scope }: { scope: string }) => <div>scope:{scope}</div>,
}))

import ProjectWebhooksSettings from './webhooks'

describe('Project webhooks page', () => {
  it('renders platform webhooks page with project scope', () => {
    render(<ProjectWebhooksSettings />)
    expect(screen.getByText('scope:project')).toBeInTheDocument()
  })
})
