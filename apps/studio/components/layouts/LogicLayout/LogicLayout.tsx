import { PropsWithChildren } from 'react'

import { ProjectLayout } from 'components/layouts/ProjectLayout'
import { ProductMenu } from 'components/ui/ProductMenu'
import type { ProductMenuGroup } from 'components/ui/ProductMenu/ProductMenu.types'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { withAuth } from 'hooks/misc/withAuth'

/**
 * Layout component for the Logic section.
 * Provides a minimal sidebar and wraps ProjectLayout.
 */
const LogicLayout = ({ children }: PropsWithChildren) => {
  const { data: project } = useSelectedProjectQuery()

  return (
    <ProjectLayout
      title="Logic"
      product="Logic"
      isBlocking={false}
      productMenu={
        <ProductMenu
          page="logic"
          menu={generateLogicMenu({ projectRef: project?.ref })}
        />
      }
    >
      {children}
    </ProjectLayout>
  )
}

export default withAuth(LogicLayout)

function generateLogicMenu({
  projectRef,
}: {
  projectRef?: string
}): ProductMenuGroup[] {
  return [
    {
      title: 'Logic',
      items: [
        {
          name: 'Flow Editor',
          key: 'logic',
          url: `/project/${projectRef}/logic`,
          items: [],
        },
      ],
    },
  ]
}
