import { useParams } from 'common/hooks/useParams'
import { TemplateInstall } from 'components/interfaces/Templates/TemplateInstall'
import DefaultLayout from 'components/layouts/DefaultLayout'
import { ProjectLayoutWithAuth } from 'components/layouts/ProjectLayout'
import { useTemplateRegistryItemQuery } from 'data/templates/template-registry-item-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import type { NextPageWithLayout } from 'types'

const TemplateInstallPage: NextPageWithLayout = () => {
  const { ref, url } = useParams()

  const templateUrl = useMemo(() => {
    if (!url) return undefined
    try {
      return decodeURIComponent(url)
    } catch {
      return url
    }
  }, [url])

  const isValidUrl = useMemo(() => {
    if (!templateUrl) return false
    try {
      new URL(templateUrl)
      return true
    } catch {
      return false
    }
  }, [templateUrl])

  const {
    data: template,
    error,
    isLoading,
  } = useTemplateRegistryItemQuery(
    { templateUrl },
    {
      enabled: isValidUrl,
    }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
          <p className="text-sm text-foreground-light">Loading template...</p>
        </div>
      </div>
    )
  }

  if (!templateUrl || !isValidUrl || error || !template || !ref) {
    const errorMessage = !templateUrl
      ? 'The `url` query parameter is required'
      : !isValidUrl
        ? 'The `url` query parameter must be a valid absolute URL'
        : error?.message ?? 'Template not found'

    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 max-w-md text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <h3 className="text-lg font-medium mb-1">Failed to Load Template</h3>
            <p className="text-sm text-foreground-light">{errorMessage}</p>
          </div>
        </div>
      </div>
    )
  }

  return <TemplateInstall template={template} templateUrl={templateUrl} projectRef={ref} />
}

TemplateInstallPage.getLayout = (page) => (
  <DefaultLayout>
    <ProjectLayoutWithAuth>{page}</ProjectLayoutWithAuth>
  </DefaultLayout>
)

export default TemplateInstallPage
