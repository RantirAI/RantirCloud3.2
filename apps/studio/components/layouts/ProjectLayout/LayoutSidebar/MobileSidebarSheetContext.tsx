import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useState } from 'react'

export type MobileSheetContentType = null | 'menu' | string

type MobileSidebarSheetContextValue = {
  /** What is shown in the sheet: null = closed, 'menu' = nav menu, string = sidebar id */
  content: MobileSheetContentType
  setContent: (content: MobileSheetContentType) => void
  /** True when the sheet is open (content !== null) */
  isOpen: boolean
  /** @deprecated Use setContent(null) to close, setContent('menu' | sidebarId) to open */
  setOpen: (open: boolean) => void
}

const MobileSidebarSheetContext = createContext<MobileSidebarSheetContextValue | null>(null)

export function MobileSidebarSheetProvider({ children }: PropsWithChildren) {
  const [content, setContentState] = useState<MobileSheetContentType>(null)
  const isOpen = content !== null

  const setOpen = useCallback((open: boolean) => {
    if (!open) setContentState(null)
  }, [])

  const setContent = useCallback((next: MobileSheetContentType) => {
    setContentState(next)
  }, [])

  return (
    <MobileSidebarSheetContext.Provider
      value={{ content, setContent, isOpen, setOpen }}
    >
      {children}
    </MobileSidebarSheetContext.Provider>
  )
}

export function useMobileSidebarSheet(): MobileSidebarSheetContextValue {
  const ctx = useContext(MobileSidebarSheetContext)
  if (!ctx) {
    throw new Error('useMobileSidebarSheet must be used within MobileSidebarSheetProvider')
  }
  return ctx
}
