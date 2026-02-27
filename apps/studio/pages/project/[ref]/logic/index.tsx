import { DefaultLayout } from 'components/layouts/DefaultLayout'
import LogicLayout from 'components/layouts/LogicLayout/LogicLayout'
import { LogicFlowCanvas } from 'components/interfaces/Logic'
import type { NextPageWithLayout } from 'types'

const LogicPage: NextPageWithLayout = () => {
  return (
    <div className="flex flex-col h-full w-full">
      <LogicFlowCanvas />
    </div>
  )
}

LogicPage.getLayout = (page) => (
  <DefaultLayout>
    <LogicLayout>{page}</LogicLayout>
  </DefaultLayout>
)

export default LogicPage
