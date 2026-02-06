import { useParams } from 'common'
import { IS_PLATFORM } from 'lib/constants'
import { ToolbarButton } from './ToolbarButton'
import { generateToolbarItems } from './SidebarToolbar.utils'

export const SidebarToolbar = () => {
  const { ref: projectRef } = useParams()

  // Generate toolbar items dynamically based on context
  const toolbarItems = generateToolbarItems({
    projectRef,
    isPlatform: IS_PLATFORM,
  })

  // Filter to only enabled items
  const enabledItems = toolbarItems.filter((item) => item.enabled)

  return (
    <div className="flex flex-col w-[50px] h-full border-l">
      <div className="flex flex-col items-center gap-2 p-2">
        {enabledItems.map((item) => (
          <ToolbarButton key={item.key} {...item.config} />
        ))}
      </div>
    </div>
  )
}
