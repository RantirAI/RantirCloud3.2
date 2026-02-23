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
  return (
    <PageSection id="custom-providers">
      <PageSectionMeta>
        <PageSectionSummary>
          <PageSectionTitle>Custom Providers</PageSectionTitle>
          <PageSectionDescription>
            Configure OAuth/OIDC providers for this project using your own issuer or endpoints.
          </PageSectionDescription>
        </PageSectionSummary>
      </PageSectionMeta>
      <PageSectionContent>
        <CustomAuthProvidersList />
      </PageSectionContent>
    </PageSection>
  )
}

export default CustomAuthProviders
