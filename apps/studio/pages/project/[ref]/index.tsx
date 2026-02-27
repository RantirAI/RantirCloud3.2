import { IS_PLATFORM, useParams } from 'common'
import { Home } from 'components/interfaces/Home/Home'
import { HomeV2 } from 'components/interfaces/HomeNew/Home'
import { LogicFlowCanvas } from 'components/interfaces/Logic'
import DefaultLayout from 'components/layouts/DefaultLayout'
import LogicLayout from 'components/layouts/LogicLayout/LogicLayout'
import { ProjectLayoutWithAuth } from 'components/layouts/ProjectLayout'
import { useTrackExperimentExposure } from 'hooks/misc/useTrackExperimentExposure'
import { usePHFlag } from 'hooks/ui/useFlag'
import { getProjectType } from 'lib/local-projects'
import { Layout } from 'lucide-react'
import type { NextPageWithLayout } from 'types'

const LogicHome = () => (
  <div className="flex flex-col h-full w-full">
    <LogicFlowCanvas />
  </div>
)

const VisualHome = () => (
  <div className="flex flex-col items-center justify-center h-full w-full gap-4 text-foreground-light">
    <Layout size={48} className="text-blue-500" />
    <h2 className="text-xl font-semibold text-foreground">Visual Builder</h2>
    <p className="text-sm">Coming soon — visual app and website builder.</p>
  </div>
)

const HomePage: NextPageWithLayout = () => {
  const { ref } = useParams()
  const projectType = getProjectType(ref ?? 'default')

  const homeNewVariant = usePHFlag<string>('homeNew')
  const isHomeNew = homeNewVariant === 'new-home'

  useTrackExperimentExposure(
    'home_new',
    IS_PLATFORM && typeof homeNewVariant !== 'boolean' ? homeNewVariant : undefined
  )

  if (projectType === 'logic') return <LogicHome />
  if (projectType === 'visual') return <VisualHome />

  if (isHomeNew) return <HomeV2 />
  return <Home />
}

HomePage.getLayout = (page) => (
  <DefaultLayout>
    <ProjectLayoutWithAuth>{page}</ProjectLayoutWithAuth>
  </DefaultLayout>
)

export default HomePage
