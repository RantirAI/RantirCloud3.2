import { useParams } from 'common'
import { ConnectButton } from 'components/interfaces/ConnectButton/ConnectButton'
import { SidebarContent } from 'components/interfaces/Sidebar'
import { UserDropdown } from 'components/interfaces/UserDropdown'
import { AdvisorButton } from 'components/layouts/AppLayout/AdvisorButton'
import { AssistantButton } from 'components/layouts/AppLayout/AssistantButton'
import { InlineEditorButton } from 'components/layouts/AppLayout/InlineEditorButton'
import { AnimatePresence } from 'framer-motion'
import { IS_PLATFORM } from 'lib/constants'
import { Menu, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Button, cn } from 'ui'
import { CommandMenuTrigger } from 'ui-patterns'
import MobileSheetNav from 'ui-patterns/MobileSheetNav/MobileSheetNav'

import { HelpDropdown } from '../LayoutHeader/HelpDropdown/HelpDropdown'
import { HomeIcon } from '../LayoutHeader/HomeIcon'
import { OrgSelector } from './OrgSelector'
import { ProjectBranchSelector } from './ProjectBranchSelector'

export const ICON_SIZE = 20
export const ICON_STROKE_WIDTH = 1.5

const MobileNavigationBar = ({ hideMobileMenu }: { hideMobileMenu?: boolean }) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const { ref: projectRef } = useParams()
  const isProjectScope = !!projectRef

  const FloatingBottomNavbar = () => (
    <nav className="flex flex-row items-center justify-between w-auto mx-auto rounded-full bg-overlay/90 backdrop-blur-md px-4 py-2 gap-2 border shadow-[0px_2px_4px_0px_rgba(0,0,0,0.10),0px_10px_20px_0px_rgba(0,0,0,0.20)]">
      <AnimatePresence initial={false}>
        {!!projectRef && (
          <>
            <AssistantButton />
            <InlineEditorButton />
          </>
        )}
        <AdvisorButton projectRef={projectRef} />
        <HelpDropdown />
        {!hideMobileMenu && (
          <Button
            title="Menu dropdown button"
            type={isSheetOpen ? 'secondary' : 'default'}
            className="flex lg:hidden rounded-md min-w-[30px] w-[30px] h-[30px] data-[state=open]:bg-overlay-hover/30"
            icon={isSheetOpen ? <X /> : <Menu />}
            onClick={() => setIsSheetOpen(true)}
          />
        )}
      </AnimatePresence>
    </nav>
  )

  return (
    <>
      <div className="w-full flex flex-row md:hidden">
        <nav
          className={cn(
            'group pr-3 pl-2 z-10 w-full h-12 gap-2',
            'border-b bg-dash-sidebar border-default shadow-xl',
            'transition-width duration-200',
            'hide-scrollbar flex flex-row items-center justify-between overflow-x-auto'
          )}
        >
          <div
            className={cn('flex min-w-0 flex-shrink items-center gap-2', !IS_PLATFORM && 'pl-2')}
          >
            {!IS_PLATFORM && <HomeIcon />}
            {isProjectScope ? (
              <>
                <ProjectBranchSelector />
                <ConnectButton className="[&_span]:hidden h-8 w-8" />
              </>
            ) : IS_PLATFORM ? (
              <OrgSelector />
            ) : null}
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <CommandMenuTrigger>
              <button
                className={cn(
                  'group',
                  'flex-grow h-[30px] rounded-md',
                  'p-2',
                  'flex items-center justify-between',
                  'bg-transparent border-none text-foreground-lighter',
                  'hover:bg-opacity-100 hover:border-strong hover:text-foreground-light',
                  'focus-visible:!outline-4 focus-visible:outline-offset-1 focus-visible:outline-brand-600',
                  'transition'
                )}
              >
                <div className="flex items-center space-x-2">
                  <Search size={18} strokeWidth={2} />
                </div>
              </button>
            </CommandMenuTrigger>
            <UserDropdown />
          </div>
        </nav>
        <MobileSheetNav open={isSheetOpen} onOpenChange={setIsSheetOpen} data-state="expanded">
          <SidebarContent />
        </MobileSheetNav>
        <div
          className={cn(
            'fixed top-0 translate-y-[calc(100vh-100px)] duration-300 left-0 right-0 w-full flex flex-row md:hidden z-[9999] transition-all',
            isSheetOpen && 'translate-y-10'
          )}
        >
          <FloatingBottomNavbar />
        </div>
      </div>
    </>
  )
}

export default MobileNavigationBar
