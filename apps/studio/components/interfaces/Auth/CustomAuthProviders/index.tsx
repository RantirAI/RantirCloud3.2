import { UpgradeToPro } from 'components/ui/UpgradeToPro'
import { useSelectedOrganizationQuery } from 'hooks/misc/useSelectedOrganization'
import { IS_PLATFORM } from 'lib/constants'
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns/PageSection'

import { CustomAuthProvidersList } from './CustomAuthProvidersList'

const CustomAuthProviders = () => {
  const { data: organization } = useSelectedOrganizationQuery()
  const isProPlanAndUp = organization?.plan?.id !== 'free'
  const promptProPlanUpgrade = IS_PLATFORM && !isProPlanAndUp

  return (
    <PageSection>
      <PageSectionMeta>
        <PageSectionSummary>
          <PageSectionTitle>Custom Providers</PageSectionTitle>
          <PageSectionDescription>
            Configure OAuth/OIDC providers for this project using your own issuer or endpoints.
          </PageSectionDescription>
        </PageSectionSummary>
      </PageSectionMeta>
      <PageSectionContent>
        {promptProPlanUpgrade ? (
          <UpgradeToPro
            source="customAuthProviders"
            featureProposition="configure customer auth providers"
            primaryText="Custom Auth Providers are only available on the Pro Plan and above"
            secondaryText="Upgrade to Pro Plan to start using Custom Auth Providers."
          />
        ) : (
          <div className="-space-y-px">
            <CustomAuthProvidersList />
          </div>
        )}
      </PageSectionContent>
    </PageSection>
  )
}

export default CustomAuthProviders
