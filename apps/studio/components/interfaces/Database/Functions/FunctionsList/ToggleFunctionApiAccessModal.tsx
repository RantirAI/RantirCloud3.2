import type { DatabaseFunction } from 'data/database-functions/database-functions-query'
import { ConfirmationModal } from 'ui-patterns/Dialogs/ConfirmationModal'

interface ToggleFunctionApiAccessModalProps {
  visible: boolean
  func?: DatabaseFunction
  enable: boolean
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ToggleFunctionApiAccessModal = ({
  visible,
  func,
  enable,
  isLoading,
  onConfirm,
  onCancel,
}: ToggleFunctionApiAccessModalProps) => {
  const { name, schema } = func ?? {}

  const title = enable ? 'Enable API access' : 'Disable API access'
  const confirmLabel = enable ? 'Enable API access' : 'Disable API access'

  const description = enable ? (
    <>
      This will grant <code className="text-xs">EXECUTE</code> privileges on the function{' '}
      <code className="text-xs">
        {schema}.{name}
      </code>{' '}
      to both <code className="text-xs">anon</code> and{' '}
      <code className="text-xs">authenticated</code> roles, making it accessible via the Data API.
    </>
  ) : (
    <>
      This will revoke <code className="text-xs">EXECUTE</code> privileges on the function{' '}
      <code className="text-xs">
        {schema}.{name}
      </code>{' '}
      from both <code className="text-xs">anon</code> and{' '}
      <code className="text-xs">authenticated</code> roles, removing access via the Data API.
    </>
  )

  const alertDescription = enable
    ? 'Anyone with your API credentials will be able to call this function.'
    : 'Existing API calls to this function will stop working.'

  return (
    <ConfirmationModal
      visible={visible}
      title={title}
      confirmLabel={confirmLabel}
      confirmLabelLoading={enable ? 'Enabling...' : 'Disabling...'}
      onCancel={onCancel}
      onConfirm={onConfirm}
      loading={isLoading}
      variant={enable ? 'warning' : 'destructive'}
      alert={{
        title: enable ? 'Security consideration' : 'Breaking change',
        description: alertDescription,
      }}
    >
      <p className="text-sm text-foreground-light">{description}</p>
    </ConfirmationModal>
  )
}
