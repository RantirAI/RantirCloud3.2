import { cn } from 'ui'

import { MockDashboardLayout } from './layout/MockDashboardLayout'
import { MockProviders } from './providers/MockProviders'
import type { SupaMockProps } from './types'

export function SupaMock({
  defaultScreen = '/dashboard/project',
  className,
  projectName,
  organizationName,
  organizationPlan,
  branchName,
  organizations,
}: SupaMockProps) {
  return (
    <div
      style={{ aspectRatio: '4 / 3' }}
      className={cn(
        'overflow-hidden rounded-lg border bg-background shadow-lg flex flex-col',
        className
      )}
    >
      <MockProviders
        defaultPath={defaultScreen}
        projectName={projectName}
        organizationName={organizationName}
        organizationPlan={organizationPlan}
        branchName={branchName}
        organizations={organizations}
      >
        <MockDashboardLayout />
      </MockProviders>
    </div>
  )
}
