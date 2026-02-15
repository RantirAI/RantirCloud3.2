import { createContext, useContext, useMemo, type ReactNode } from 'react'

import type { MockProject, MockProjectContextType, SupaMockOrganization } from '../types'

const MockProjectContext = createContext<MockProjectContextType | null>(null)

export function useMockProject(): MockProjectContextType {
  const ctx = useContext(MockProjectContext)
  if (!ctx) {
    throw new Error('useMockProject must be used within a MockProjectProvider')
  }
  return ctx
}

interface MockProjectProviderProps {
  projectName?: string
  organizationName?: string
  organizationPlan?: string
  branchName?: string
  organizations?: SupaMockOrganization[]
  children: ReactNode
}

const DEFAULT_PROJECT: MockProject = {
  ref: 'mock-project-ref',
  name: 'Playground',
  status: 'ACTIVE_HEALTHY',
  region: 'us-east-1',
  organization: {
    name: 'Supabase',
    slug: 'supabase',
    plan: 'Free',
  },
  branchName: 'main',
}

export function MockProjectProvider({
  projectName,
  organizationName,
  organizationPlan,
  branchName,
  organizations = [],
  children,
}: MockProjectProviderProps) {
  const project = useMemo<MockProject>(
    () => ({
      ...DEFAULT_PROJECT,
      ...(projectName && { name: projectName }),
      ...(branchName && { branchName }),
      ...(organizationName && {
        organization: {
          ...DEFAULT_PROJECT.organization,
          name: organizationName,
          slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
          ...(organizationPlan && { plan: organizationPlan }),
        },
      }),
      ...(organizationPlan &&
        !organizationName && {
          organization: {
            ...DEFAULT_PROJECT.organization,
            plan: organizationPlan,
          },
        }),
    }),
    [projectName, organizationName, organizationPlan, branchName]
  )

  return (
    <MockProjectContext.Provider value={{ project, organizations }}>
      {children}
    </MockProjectContext.Provider>
  )
}
