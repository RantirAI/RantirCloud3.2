import Link from 'next/link'

import { DocsButton } from 'components/ui/DocsButton'
import {
  BreadcrumbItem_Shadcn_ as BreadcrumbItem,
  BreadcrumbLink_Shadcn_ as BreadcrumbLink,
  BreadcrumbList_Shadcn_ as BreadcrumbList,
  BreadcrumbPage_Shadcn_ as BreadcrumbPage,
  BreadcrumbSeparator_Shadcn_ as BreadcrumbSeparator,
  Button,
} from 'ui'
import {
  PageHeader,
  PageHeaderAside,
  PageHeaderBreadcrumb,
  PageHeaderDescription,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'

interface PlatformWebhooksHeaderProps {
  hasSelectedEndpoint: boolean
  headerTitle: string
  headerDescription: string
  webhooksHref: string
}

export const PlatformWebhooksHeader = ({
  hasSelectedEndpoint,
  headerTitle,
  headerDescription,
  webhooksHref,
}: PlatformWebhooksHeaderProps) => {
  return (
    <PageHeader size="default" className="pb-6">
      {hasSelectedEndpoint && (
        <PageHeaderBreadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={webhooksHref}>Webhooks</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Endpoint details</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </PageHeaderBreadcrumb>
      )}
      <PageHeaderMeta>
        <PageHeaderSummary>
          <PageHeaderTitle>{headerTitle}</PageHeaderTitle>
          <PageHeaderDescription>{headerDescription}</PageHeaderDescription>
        </PageHeaderSummary>
        <PageHeaderAside>
          <DocsButton href="https://supabase.com/docs" />
          <Button asChild type="default">
            <a target="_blank" rel="noopener noreferrer" href="https://supabase.com">
              Leave feedback
            </a>
          </Button>
        </PageHeaderAside>
      </PageHeaderMeta>
    </PageHeader>
  )
}
