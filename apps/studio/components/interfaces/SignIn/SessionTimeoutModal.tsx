import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { InlineLink, InlineLinkClassName } from 'components/ui/InlineLink'
import {
  AlertCollapsible,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
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
              <p>Your session has expired. Sign in again to continue.</p>
              <AlertCollapsible trigger="Having trouble?">
                <div className="space-y-3 text-foreground-light">
                  <p>
                    Try a different browser or disable extensions that block network requests. If
                    the problem persists:
                  </p>
                  <Button type="default" size="tiny" onClick={handleClearStorage}>
                    Clear site data and reload
                  </Button>
                  <p>
                    Still stuck?{' '}
                    <SupportLink
                      className={InlineLinkClassName}
                      queryParams={{ subject: 'Session expired' }}
                    >
                      Contact support
                    </SupportLink>{' '}
                    or{' '}
                    <InlineLink href="https://github.com/orgs/supabase/discussions/36540">
                      generate a HAR file
                    </InlineLink>{' '}
                    from your session to help us debug.
                  </p>
                </div>
              </AlertCollapsible>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={redirectToSignIn}>Sign in again</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
