import * as Sentry from '@sentry/nextjs'
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
              <p className="text-foreground-light">
                If you can't sign in, try:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-foreground-light">
                <li>Use a different browser</li>
                <li>Disable extensions that block network requests</li>
                <li>
                  <button
                    type="button"
                    title="Clear site data and reload"
                    className="underline hover:no-underline"
                    onClick={handleClearStorage}
                  >
                    Clear site data and reload
                  </button>
                </li>
              </ul>
              <p className="text-foreground-light">
                Still having trouble?{' '}
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
