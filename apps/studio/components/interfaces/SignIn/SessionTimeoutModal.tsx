import * as Sentry from '@sentry/nextjs'
import { ChevronDown } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { InlineLink, InlineLinkClassName } from 'components/ui/InlineLink'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  cn,
  Collapsible_Shadcn_,
  CollapsibleContent_Shadcn_,
  CollapsibleTrigger_Shadcn_,
} from 'ui'
import { SupportLink } from '../Support/SupportLink'

interface SessionTimeoutModalProps {
  visible: boolean
  onClose: () => void
  redirectToSignIn: () => void
}

export const SessionTimeoutModal = ({
  visible,
  onClose,
  redirectToSignIn,
}: SessionTimeoutModalProps) => {
  useEffect(() => {
    if (visible) {
      Sentry.captureException(new Error('Session error detected'))
    }
  }, [visible])

  const handleClearStorage = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (e) {
      toast.error('Failed to clear browser storage')
    }
    window.location.reload()
  }

  return (
    <AlertDialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <AlertDialogContent size="small">
        <AlertDialogHeader>
          <AlertDialogTitle>Session expired</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Your session has expired. Sign in again to continue.
              </p>
              <div
                className={cn(
                  'relative w-full rounded-lg border p-4 text-sm',
                  'bg-surface-200/25 border-default text-foreground'
                )}
              >
                <Collapsible_Shadcn_>
                  <CollapsibleTrigger_Shadcn_
                    className={cn(
                      'flex w-full items-center justify-between gap-2 text-left font-medium',
                      '[&[data-state=open]>svg]:rotate-180'
                    )}
                  >
                    Having trouble?
                    <ChevronDown className="h-4 w-4 shrink-0 text-foreground-light transition-transform duration-200" />
                  </CollapsibleTrigger_Shadcn_>
                  <CollapsibleContent_Shadcn_ className="space-y-3 pt-3">
                    <p className="text-foreground-light">
                      Try a different browser or disable extensions that block network requests. If the problem persists:
                    </p>
                    <Button type="default" size="tiny" onClick={handleClearStorage}>
                      Clear site data and reload
                    </Button>
                    <p className="text-foreground-light">
                      Still stuck?{' '}
                      <SupportLink
                        className={InlineLinkClassName}
                        queryParams={{ subject: 'Session expired' }}
                      >
                        Contact support
                      </SupportLink>
                      {' '}
                      or{' '}
                      <InlineLink href="https://github.com/orgs/supabase/discussions/36540">
                        generate a HAR file
                      </InlineLink>
                      {' '}
                      from your session to help us debug.
                    </p>
                  </CollapsibleContent_Shadcn_>
                </Collapsible_Shadcn_>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={redirectToSignIn}>
            Sign in again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
