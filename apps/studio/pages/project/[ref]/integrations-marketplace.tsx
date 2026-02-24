import { DefaultLayout } from 'components/layouts/DefaultLayout'
import { ProjectLayout } from 'components/layouts/ProjectLayout'
import AlertError from 'components/ui/AlertError'
import { CatalogOAuthApp, useOAuthAppsCatalogQuery } from 'data/oauth/oauth-apps-catalog-query'
import { Download, ExternalLink } from 'lucide-react'
import type { NextPageWithLayout } from 'types'
import { Card, CardContent, cn } from 'ui'
import { PageContainer } from 'ui-patterns/PageContainer'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'
import { PageSection, PageSectionContent } from 'ui-patterns/PageSection'
import { ShimmeringLoader } from 'ui-patterns/ShimmeringLoader'

function OAuthAppCard({ app, rank }: { app: CatalogOAuthApp; rank: number }) {
  const website = app.website
  const hostname = (() => {
    try {
      return new URL(website).hostname
    } catch {
      return website
    }
  })()

  return (
    <a href={website} target="_blank" rel="noopener noreferrer" className="h-full">
      <Card className="h-full">
        <CardContent className="flex flex-col p-4 @2xl:p-6 h-full">
          <div className="flex items-start justify-between mb-4">
            <div
              className={cn(
                'shrink-0 w-10 h-10 relative border rounded-md flex items-center justify-center',
                'bg-no-repeat bg-cover bg-center text-foreground-light font-semibold bg-surface-200'
              )}
              style={{ backgroundImage: app.icon ? `url('${app.icon}')` : 'none' }}
            >
              {!app.icon && app.name[0]}
            </div>
            <div className={cn('text-foreground-light text-xs font-mono')}>#{rank + 1}</div>
          </div>
          <div className="flex-col justify-start items-start gap-y-0.5 flex flex-1">
            <h3 className="text-foreground text-sm">{app.name}</h3>
            <div className="flex items-center gap-1 text-foreground-light text-xs mt-1">
              <ExternalLink size={12} className="shrink-0" />
              <span className="truncate">{hostname}</span>
            </div>
            <div className="flex items-center gap-1 text-foreground-lighter text-xs mt-2">
              <Download size={12} className="shrink-0" />
              <span>
                {app.install_count.toLocaleString()}{' '}
                {app.install_count === 1 ? 'install' : 'installs'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  )
}

function OAuthAppLoadingCard() {
  return (
    <Card>
      <CardContent className="flex flex-col p-4 @2xl:p-6">
        <div className="w-10 h-10 rounded-md bg-surface-200 animate-pulse mb-4" />
        <div className="flex flex-col gap-2">
          <ShimmeringLoader className="w-2/3" />
          <ShimmeringLoader className="w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}

const IntegrationsMarketplacePage: NextPageWithLayout = () => {
  const { data: apps, error, isPending: isLoading, isSuccess, isError } = useOAuthAppsCatalogQuery()

  // Sort by install count descending (most popular first), then alphabetically as tiebreaker
  const sortedApps = (apps ?? []).sort(
    (a, b) => b.install_count - a.install_count || a.name.localeCompare(b.name)
  )

  return (
    <>
      <PageHeader size="large">
        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>Integrations</PageHeaderTitle>
            <PageHeaderDescription>
              Browse available OAuth applications and integrations
            </PageHeaderDescription>
          </PageHeaderSummary>
        </PageHeaderMeta>
      </PageHeader>

      <PageContainer size="large">
        <PageSection>
          <PageSectionContent>
            {isLoading && (
              <div
                className="grid @xl:grid-cols-3 @6xl:grid-cols-4 gap-4"
                style={{ gridAutoRows: 'minmax(110px, auto)' }}
              >
                {new Array(8).fill(0).map((_, idx) => (
                  <OAuthAppLoadingCard key={`loading-${idx}`} />
                ))}
              </div>
            )}

            {isError && <AlertError error={error} subject="Failed to retrieve integrations" />}

            {isSuccess && (
              <>
                {sortedApps.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-foreground-light">No integrations available yet</p>
                  </div>
                ) : (
                  <div className="grid @xl:grid-cols-3 @6xl:grid-cols-4 gap-4">
                    {sortedApps.map((app, i) => (
                      <OAuthAppCard key={app.id} app={app} rank={i} />
                    ))}
                  </div>
                )}
              </>
            )}
          </PageSectionContent>
        </PageSection>
      </PageContainer>
    </>
  )
}

IntegrationsMarketplacePage.getLayout = (page) => (
  <DefaultLayout>
    <ProjectLayout title="Integrations" product="Integrations" isBlocking={false}>
      {page}
    </ProjectLayout>
  </DefaultLayout>
)

export default IntegrationsMarketplacePage
