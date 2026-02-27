import { PropsWithChildren } from 'react'

import { useParams } from 'common'
import type { SidebarSection } from 'components/layouts/AccountLayout/AccountLayout.types'
import { WithSidebar } from 'components/layouts/AccountLayout/WithSidebar'
import { useCurrentPath } from 'hooks/misc/useCurrentPath'
import { useIsFeatureEnabled } from 'hooks/misc/useIsFeatureEnabled'

interface OrganizationSettingsMenuItemsProps {
  slug?: string
  showSecuritySettings?: boolean
  showSsoSettings?: boolean
  showLegalDocuments?: boolean
}

interface OrganizationSettingsSectionsProps extends OrganizationSettingsMenuItemsProps {
  currentPath: string
}

export const normalizeOrganizationSettingsPath = (path: string) => path.split('#')[0]

export const generateOrganizationSettingsMenuItems = ({
  slug,
  showSecuritySettings = true,
  showSsoSettings = true,
  showLegalDocuments = true,
}: OrganizationSettingsMenuItemsProps) => [
  {
    key: 'general',
    label: 'General',
    href: `/org/${slug}/general`,
  },
  ...(showSecuritySettings
    ? [
        {
          key: 'security',
          label: 'Security',
          href: `/org/${slug}/security`,
        },
      ]
    : []),
  {
    key: 'apps',
    label: 'OAuth Apps',
    href: `/org/${slug}/apps`,
  },
  ...(showSsoSettings
    ? [
        {
          key: 'sso',
          label: 'SSO',
          href: `/org/${slug}/sso`,
        },
      ]
    : []),
  {
    key: 'webhooks',
    label: 'Platform Webhooks',
    href: `/org/${slug}/webhooks`,
  },
  {
    key: 'audit',
    label: 'Audit Logs',
    href: `/org/${slug}/audit`,
  },
  ...(showLegalDocuments
    ? [
        {
          key: 'documents',
          label: 'Legal Documents',
          href: `/org/${slug}/documents`,
        },
      ]
    : []),
]

export const generateOrganizationSettingsSections = ({
  currentPath,
  slug,
  showSecuritySettings = true,
  showSsoSettings = true,
  showLegalDocuments = true,
}: OrganizationSettingsSectionsProps): SidebarSection[] => {
  const links = generateOrganizationSettingsMenuItems({
    slug,
    showSecuritySettings,
    showSsoSettings,
    showLegalDocuments,
  })

  return [
    {
      key: 'organization-settings',
      heading: 'Organization Settings',
      links: links.map((item) => ({
        ...item,
        isActive: currentPath === item.href,
      })),
    },
  ]
}

function OrganizationSettingsLayout({ children }: PropsWithChildren) {
  const { slug } = useParams()
  const fullCurrentPath = useCurrentPath()
  const currentPath = normalizeOrganizationSettingsPath(fullCurrentPath)

  const {
    organizationShowSsoSettings: showSsoSettings,
    organizationShowSecuritySettings: showSecuritySettings,
    organizationShowLegalDocuments: showLegalDocuments,
  } = useIsFeatureEnabled([
    'organization:show_sso_settings',
    'organization:show_security_settings',
    'organization:show_legal_documents',
  ])

  const sections = generateOrganizationSettingsSections({
    currentPath,
    slug,
    showSecuritySettings,
    showSsoSettings,
    showLegalDocuments,
  })

  return (
    <WithSidebar title="Organization Settings" breadcrumbs={[]} sections={sections}>
      {children}
    </WithSidebar>
  )
}

export default OrganizationSettingsLayout
