import { LOCAL_STORAGE_KEYS, useParams } from 'common'
import { ConnectButton } from 'components/interfaces/ConnectButton/ConnectButton'
import { UserDropdown } from 'components/interfaces/UserDropdown'
import { useLocalStorageQuery } from 'hooks/misc/useLocalStorage'
import { IS_PLATFORM } from 'lib/constants'
import { Search } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect } from 'react'
import { cn } from 'ui'
import { CommandMenuTrigger } from 'ui-patterns'

import { HomeIcon } from '../LayoutHeader/HomeIcon'
import FloatingBottomNavbar from './FloatingBottomNavbar'
import FloatingBottomNavbarBreadcrumb from './FloatingBottomNavbarBreadcrumb'
import { OrgSelector } from './OrgSelector'
import { ProjectBranchSelector } from './ProjectBranchSelector'

export const ICON_SIZE = 20
export const ICON_STROKE_WIDTH = 1.5

const MobileNavigationBar = ({ hideMobileMenu }: { hideMobileMenu?: boolean }) => {
  const { ref: projectRef } = useParams()
  const [urlShowNavbarB] = useQueryState('showNavbarB', parseAsString)
  const [localShowNavbarB, setLocalShowNavbarB] = useLocalStorageQuery(
    LOCAL_STORAGE_KEYS.SHOW_NAVBAR_B,
    false
  )

  // When the flag is in the URL, use it and persist to localStorage
  useEffect(() => {
    if (urlShowNavbarB !== null) {
      const value = urlShowNavbarB === 'true'
      setLocalShowNavbarB(value)
    }
  }, [urlShowNavbarB, setLocalShowNavbarB])

  const showNavbarB = urlShowNavbarB !== null ? urlShowNavbarB === 'true' : localShowNavbarB
  const isProjectScope = !!projectRef

  return (
    <div className="w-full flex flex-row md:hidden">
      <nav
        className={cn(
          'group pr-3 pl-2 z-10 w-full h-12 gap-2',
          'border-b bg-dash-sidebar border-default shadow-xl',
          'transition-width duration-200',
          'hide-scrollbar flex flex-row items-center justify-between overflow-x-auto'
        )}
      >
        <div className={cn('flex min-w-0 flex-shrink items-center gap-2', !IS_PLATFORM && 'pl-2')}>
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
              type="button"
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
      {showNavbarB ? <FloatingBottomNavbarBreadcrumb /> : <FloatingBottomNavbar hideMobileMenu={hideMobileMenu} />}
    </div>
  )
}

export default MobileNavigationBar
