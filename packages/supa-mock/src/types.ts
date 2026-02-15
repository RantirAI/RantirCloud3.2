import type { ComponentType, ReactNode } from 'react'

export interface SupaMockOrganization {
  name: string
  slug: string
}

export interface SupaMockProps {
  defaultScreen?: string
  className?: string
  projectName?: string
  organizationName?: string
  organizationPlan?: string
  branchName?: string
  organizations?: SupaMockOrganization[]
}

export interface MockRoute {
  key: string
  path: string
  label: string
  icon: ReactNode
  component: ComponentType
  disabled?: boolean
}

export interface MockRouterContextType {
  currentPath: string
  navigate: (path: string) => void
  goBack: () => void
}

export interface MockProject {
  ref: string
  name: string
  status: string
  region: string
  organization: {
    name: string
    slug: string
    plan: string
  }
  branchName: string
}

export interface MockUser {
  id: string
  email: string
  displayName: string
}

export interface MockProjectContextType {
  project: MockProject
  organizations: SupaMockOrganization[]
}

export interface MockUserContextType {
  user: MockUser
}
