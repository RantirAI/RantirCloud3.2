import { Check, Globe, X } from 'lucide-react'
import { Badge, DropdownMenuItem, Tooltip, TooltipContent, TooltipTrigger } from 'ui'

import type { FunctionApiAccessData } from '@/data/privileges/function-api-access-query'

export function ApiAccessCell({ apiAccessData }: { apiAccessData?: FunctionApiAccessData }) {
  if (!apiAccessData) {
    return <p className="truncate text-foreground-muted">–</p>
  }

  if (apiAccessData.apiAccessType === 'none') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="default">
            <X size={12} className="mr-1" />
            No
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          Schema is not exposed via the Data API. Enable the schema in API settings to allow API
          access.
        </TooltipContent>
      </Tooltip>
    )
  }

  if (apiAccessData.apiAccessType === 'exposed-schema-no-grants') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="default">
            <X size={12} className="mr-1" />
            No
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          Function is not accessible via the Data API. Grant <code>EXECUTE</code> privileges to anon
          or authenticated roles to enable access.
        </TooltipContent>
      </Tooltip>
    )
  }

  const roles = []
  if (apiAccessData.privileges.anon) roles.push('anon')
  if (apiAccessData.privileges.authenticated) roles.push('authenticated')

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="default">
          <Check size={12} className="mr-1" />
          Yes
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        Function is accessible via the Data API for roles: {roles.join(', ')}
      </TooltipContent>
    </Tooltip>
  )
}

export function ApiAccessMenuItem({
  apiAccessData,
  onToggle,
}: {
  apiAccessData?: FunctionApiAccessData
  onToggle: (enable: boolean) => void
}) {
  if (!apiAccessData) {
    return null
  }

  // If schema is not exposed, don't show the toggle option
  if (apiAccessData.apiAccessType === 'none') {
    return null
  }

  const hasAccess = apiAccessData.apiAccessType === 'access'

  return (
    <DropdownMenuItem className="space-x-2" onClick={() => onToggle(!hasAccess)}>
      <Globe size={14} />
      <p>{hasAccess ? 'Disable API access' : 'Enable API access'}</p>
    </DropdownMenuItem>
  )
}
