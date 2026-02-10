import type { IncidentInfo } from 'lib/api/incident-status'
import { AlertCircleIcon, Cog } from 'lucide-react'
import { Separator } from 'ui'

import StatusIcon from './StatusIcon'

export type SystemStatus = 'operational' | 'incident' | 'maintenance'

export interface BadgeVariant {
  variant: 'success' | 'warning'
  label: string
  icon: JSX.Element
  hoverStyle: string
}

export function deriveSystemStatus(
  incidents: IncidentInfo[],
  maintenanceEvents: IncidentInfo[],
  hasOverride: boolean
): SystemStatus {
  if (hasOverride) return 'incident'

  const highImpactIncident = incidents.find((incident) => incident.impact !== 'none')
  if (highImpactIncident) return 'incident'

  if (maintenanceEvents.length > 0) return 'maintenance'

  return 'operational'
}

export function getBadgeConfig(status: SystemStatus): BadgeVariant {
  switch (status) {
    case 'operational':
      return {
        variant: 'success',
        label: 'Operational',
        icon: <StatusIcon status="operational" />,
        hoverStyle: 'aspect-square border-transparent hover:border-stronger bg-transparent',
      }
    case 'incident':
      return {
        variant: 'warning',
        label: 'Investigating issue',
        icon: <AlertCircleIcon className="w-3 h-3" />,
        hoverStyle: 'hover:border-warning/50 hover:bg-warning-300',
      }
    case 'maintenance':
      return {
        variant: 'warning',
        label: 'Ongoing Maintenance',
        icon: <Cog className="w-3 h-3 animate-spin" />,
        hoverStyle: 'hover:border-warning/50 hover:bg-warning-300',
      }
  }
}

export function formatActiveSince(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  } catch {
    return dateString
  }
}

export interface TooltipContentProps {
  status: SystemStatus
  incident?: IncidentInfo
  maintenanceEvent?: IncidentInfo
}

export function getTooltipContent({ status, incident, maintenanceEvent }: TooltipContentProps) {
  if (status === 'operational') {
    return (
      <div className="flex flex-col gap-2 p-2">
        <p className="text-xs text-foreground-lighter">All systems are operational</p>
      </div>
    )
  }

  if (status === 'incident' && incident) {
    return (
      <div className="flex flex-col gap-2 p-2">
        <p className="text-xs text-foreground-light">We are investigating a technical issue</p>
        <Separator />
        <div>
          <p className="text-xs text-warning">{incident.name}</p>
        </div>
      </div>
    )
  }

  if (status === 'maintenance' && maintenanceEvent) {
    return (
      <div className="flex flex-col gap-2 p-2">
        <p className="text-xs text-foreground-light">
          Scheduled maintenance is currently in progress
          <span className="inline-block w-[1.2em] text-left after:content-[''] after:animate-ellipsis after:inline-block" />
        </p>
        <div className="flex flex-col gap-0.5 text-xs text-foreground-lighter">
          <p>{maintenanceEvent.name}</p>
          <p>{formatActiveSince(maintenanceEvent.active_since)}</p>
        </div>
      </div>
    )
  }

  return null
}
