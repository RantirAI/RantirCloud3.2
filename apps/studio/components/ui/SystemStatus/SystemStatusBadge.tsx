import { useFlag } from 'common'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { Badge, Button, cn, Tooltip, TooltipContent, TooltipTrigger } from 'ui'

import { deriveSystemStatus, getBadgeConfig, getTooltipContent } from './SystemStatus.utils'
import { useIncidentStatusQuery } from '@/data/platform/incident-status-query'

export const SystemStatusBadge = () => {
  const { data: allStatusPageEvents } = useIncidentStatusQuery()
  const { incidents = [], maintenanceEvents = [] } = allStatusPageEvents ?? {}

  const showIncidentBannerOverride =
    useFlag('ongoingIncident') || process.env.NEXT_PUBLIC_ONGOING_INCIDENT === 'true'

  const status = deriveSystemStatus(incidents, maintenanceEvents, showIncidentBannerOverride)
  const highImpactIncident = incidents.find((incident) => incident.impact !== 'none')
  const currentIncident = showIncidentBannerOverride ? incidents[0] : highImpactIncident
  const currentMaintenance = maintenanceEvents[0]

  const badgeConfig = getBadgeConfig(status)
  const isOperational = status === 'operational'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={badgeConfig.variant}
          className={cn('cursor-pointer', badgeConfig.hoverStyle)}
        >
          <Link
            href="https://status.supabase.com"
            target="_blank"
            className="flex items-center gap-1"
          >
            {badgeConfig.icon}
            {!isOperational ? badgeConfig.label : null}
          </Link>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="w-screen !max-w-[240px] p-0">
        {getTooltipContent({
          status,
          incident: currentIncident,
          maintenanceEvent: currentMaintenance,
        })}
        <footer className="w-full flex flex-col items-start gap-1 p-2 bg-overlay border-t">
          <Button
            type="default"
            size="tiny"
            iconRight={<ArrowUpRight className="w-3 h-3" />}
            asChild
          >
            <Link href="https://status.supabase.com" target="_blank">
              View Status Page
            </Link>
          </Button>
        </footer>
      </TooltipContent>
    </Tooltip>
  )
}

export default SystemStatusBadge
