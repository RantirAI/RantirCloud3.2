import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useTheme } from 'next-themes'

import { useErrorCodesQuery } from 'data/content-api/docs-error-codes-query'
import { Service } from 'data/graphql/graphql'
import { BASE_PATH } from 'lib/constants'
import {
  Button,
  HoverCard_Shadcn_,
  HoverCardContent_Shadcn_,
  HoverCardTrigger_Shadcn_,
} from 'ui'
import { ShimmeringLoader } from 'ui-patterns/ShimmeringLoader'

const SERVICE_DOCS_URLS: Partial<Record<Service, string>> = {
  [Service.Auth]: 'https://supabase.com/docs/guides/auth/debugging/error-codes',
}

interface ErrorCodeTooltipProps {
  errorCode: string
  service?: Service
  children: React.ReactNode
}

export const ErrorCodeTooltip = ({ errorCode, service, children }: ErrorCodeTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { resolvedTheme } = useTheme()

  const { data, isPending } = useErrorCodesQuery(
    { code: errorCode, service },
    { enabled: isOpen }
  )

  const errors = data?.errors?.nodes?.filter((e) => !!e.message) ?? []

  const docsUrl =
    errors.map((e) => SERVICE_DOCS_URLS[e.service]).find(Boolean) ??
    (service ? SERVICE_DOCS_URLS[service] : undefined)

  return (
    <HoverCard_Shadcn_ open={isOpen} onOpenChange={setIsOpen} openDelay={200} closeDelay={100}>
      <HoverCardTrigger_Shadcn_ asChild>
        <span className="inline-flex items-center gap-1 cursor-default">
          {children}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-3.5 h-3.5 text-foreground-lighter shrink-0"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z"
            />
          </svg>
        </span>
      </HoverCardTrigger_Shadcn_>
      <HoverCardContent_Shadcn_ side="top" align="center" className="w-[360px] p-0 overflow-hidden">
        <div className="flex flex-col">
          <div className="px-4 pt-3 pb-2.5 border-b border-border">
            <p className="font-mono text-xs uppercase text-foreground-light">{errorCode}</p>
          </div>

          <div className="px-4 py-3 space-y-2">
            {isPending ? (
              <div className="space-y-1.5">
                <ShimmeringLoader className="w-full" />
                <ShimmeringLoader className="w-4/5" />
                <ShimmeringLoader className="w-3/5" />
              </div>
            ) : errors.length === 0 ? (
              <p className="text-sm text-foreground-lighter">
                No description available for this error code.
              </p>
            ) : (
              <p className="text-sm text-foreground leading-relaxed">{errors[0].message}</p>
            )}
          </div>

          {docsUrl && (
            <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Image
                  src={
                    resolvedTheme?.includes('dark')
                      ? `${BASE_PATH}/img/supabase-dark.svg`
                      : `${BASE_PATH}/img/supabase-light.svg`
                  }
                  alt="Supabase"
                  height={14}
                  width={72}
                />
                <span className="font-mono text-[11px] font-semibold text-brand tracking-wide">
                  DOCS
                </span>
              </div>
              <Button type="default" size="tiny" asChild>
                <Link href={docsUrl} target="_blank" rel="noreferrer">
                  Continue reading
                </Link>
              </Button>
            </div>
          )}
        </div>
      </HoverCardContent_Shadcn_>
    </HoverCard_Shadcn_>
  )
}
