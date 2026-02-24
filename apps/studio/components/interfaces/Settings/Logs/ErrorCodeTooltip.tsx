import { useState } from 'react'
import { useErrorCodesQuery } from 'data/content-api/docs-error-codes-query'
import { Service } from 'data/graphql/graphql'
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from 'ui'
import { ShimmeringLoader } from 'ui-patterns/ShimmeringLoader'

const SERVICE_DOCS_URLS: Partial<Record<Service, string>> = {
  [Service.Auth]: 'https://supabase.com/docs/guides/auth/auth-error-codes',
}

interface ErrorCodeTooltipProps {
  errorCode: string
  service?: Service
  children: React.ReactNode
}

export const ErrorCodeTooltip = ({ errorCode, service, children }: ErrorCodeTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const { data, isPending } = useErrorCodesQuery(
    { code: errorCode, service },
    { enabled: isOpen }
  )

  const errors = data?.errors?.nodes?.filter((e) => !!e.message) ?? []

  const docsUrl =
    errors.map((e) => SERVICE_DOCS_URLS[e.service]).find(Boolean) ??
    (service ? SERVICE_DOCS_URLS[service] : undefined)

  return (
    <Tooltip open={isOpen} onOpenChange={setIsOpen} delayDuration={300}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 text-left space-y-2">
        {isPending ? (
          <div className="space-y-1.5 w-44">
            <ShimmeringLoader className="w-3/4" />
            <ShimmeringLoader className="w-1/2" />
          </div>
        ) : errors.length === 0 ? (
          <p className="text-xs text-foreground-lighter">No description found.</p>
        ) : (
          <>
            <div className="space-y-2">
              {errors.map((error) => (
                <div key={`${error.service}-${error.code}`} className="space-y-1">
                  <Badge className="text-[10px] h-4">{error.service}</Badge>
                  <p className="text-xs text-foreground leading-relaxed">{error.message}</p>
                </div>
              ))}
            </div>
            {docsUrl && (
              <a
                href={docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand hover:underline block pt-0.5"
              >
                View docs →
              </a>
            )}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
